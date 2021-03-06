import * as React from 'react';
import { Animated, View, SafeAreaView, ScrollView, StyleSheet, StatusBar, TouchableOpacity, Image, Button, RefreshControl } from 'react-native';
import { ActionBar, WebVibe, TextVibe, ModalVibe, ButtonVibe, DialogVibe } from 'chessvibe/src/widgets';
import AutoHeightImage from 'react-native-auto-height-image';
import SideMenu from 'react-native-side-menu';
import messaging from '@react-native-firebase/messaging';

import { HomeStore } from 'chessvibe/src/redux/Store';
import { useSelector } from 'react-redux';

import { URL, TEAM, IMAGE, STORAGE_IS_DARK_THEME, MATCH_MODE } from 'chessvibe/src/Const';
import Util, { formatDate, vw, wh, strict_equal } from 'chessvibe/src/Util';
import Cache from 'chessvibe/src/Cache';
import Backend from 'chessvibe/src/Backend';
import Storage from 'chessvibe/src/Storage';
import Stats from 'chessvibe/src/Stats';

import HomeUserMenu from './HomeUserMenu';
import HomeCreateMenu from './HomeCreateMenu';
import NotificationMenu from './NotificationMenu';
import PlayTab from './PlayTab';
import HistoryTab from './HistoryTab';
import FriendsTab from './FriendsTab';
import SettingsTab from './SettingsTab';


const matchSize = vw((100 - 2 - 6 - 4) / 4);
const borderRadius = vw();

const NAV_TITLE = {
	play: 'ChessVibe',
	history: 'History',
	friends: 'Friends',
	settings: 'Settings',
};

const wait = (timeout) => {
	return new Promise(resolve => {
		setTimeout(resolve, timeout);
	});
}

// Navigation
HomeScreen.navigationOptions = ({navigation}) => {
	const { params = {} } = navigation.state;
	return ActionBar(NAV_TITLE[params.tab], 'MENU', params.openMenu, 'BELL', params.openCreate, params.isDarkTheme);
};


// Home Screen
export default function HomeScreen(props) {
	const isDarkTheme = useSelector(state => state.home.isDarkTheme);

	const [ opponents, setOpponents ] = React.useState(Cache.home.opponents);
	const [ matches, setMatches ] = React.useState(Cache.home.matches);
	const [ createMenuVisible, showCreateMenu ] = React.useState({ show: false });
	const [ refreshing, setRefreshing ] = React.useState(false);
	const [ notificationsVisible, showNotifications ] = React.useState(false);

	const onRefresh = React.useCallback(() => refresh(), []);
	const user = React.useRef({});

	const { params = {} } = props.navigation.state;
	const { tab='play' } = params;
	const hidden = { display: 'none' };

	function refresh() {
		setRefreshing(true);
		fetchMatches();
	}

	// Mount
	React.useEffect(() => {
		// Call when switching nav stack
		props.navigation.addListener('didFocus', () => {
			Backend.init();
			Backend.listenProfile(async res => {
				user.current = res.data;
				Cache.user = user.current;

				HomeStore.updateUser(user.current);
				fetchMatches();
			});
		});
	}, []);


	React.useEffect(() => {
		props.navigation.setParams({
			tab: tab,
			isDarkTheme: isDarkTheme,
			openMenu: () => {
				props.screenProps.openDrawer(true);
			},
			openCreate: () => {
				showNotifications(!notificationsVisible);
			},
		});
	}, [tab, isDarkTheme, notificationsVisible]);

	// Upload APNS Token for push notification
	React.useEffect(() => {
		// Get the device token
		messaging().getToken().then(token => Backend.uploadAPNSToken(token));
		console.log();

		// If using other push notification providers (ie Amazon SNS, etc)
		// you may need to get the APNs token instead for iOS:
		// if(Platform.OS == 'ios') { messaging().getAPNSToken().then(token => { return Backend.uploadAPNSToken(token); }); }

		// Listen to whether the token changes
		return messaging().onTokenRefresh(token => Backend.uploadAPNSToken(token));
	}, []);

	// Render function
	function render() {
		return (
			<SafeAreaView style={ styles.view }>
				<StatusBar hidden={ true }/>

				<PlayTab
					navigation={ props.navigation }
					navigateGame={ navigateGame }
					newMatches={ matches.new }
					showCreateMenu={ showCreateMenu }
					isDarkTheme={ isDarkTheme }
					style={ tab == 'play' ? {} : hidden }/>

				<HistoryTab
					navigation={ props.navigation }
					oldMatches={ matches.old }
					navigateGame={ navigateGame }
					refreshing={ refreshing }
					refresh={ refresh }
					isDarkTheme={ isDarkTheme }
					style={ tab == 'history' ? {} : hidden }/>

				<FriendsTab
					navigation={ props.navigation }
					isDarkTheme={ isDarkTheme }
					opponents={ opponents }
					friends={ user.current.friends }
					style={ tab == 'friends' ? {} : hidden }/>

				<SettingsTab
					navigation={ props.navigation }
					isDarkTheme={ isDarkTheme }
					style={ tab == 'settings' ? {} : hidden }/>

				<HomeCreateMenu
					visible={ createMenuVisible.show }
					mode={ createMenuVisible.mode }
					opponents={ opponents }
					friends={ user.current.friends }
					onDismiss={ () => showCreateMenu({ show: false, mode: createMenuVisible.mode }) }
					onSubmit={(theme, time, friend, isAI) => {
						showCreateMenu({ show: false });
						Backend.createMatch(theme, time, friend, isAI).then(match_id => {
							Cache.theme[match_id] = theme;
							navigateGame(match_id);
						});
					} }/>

				<NotificationMenu
					matches={ user.current.matches }
					navigateGame={ navigateGame }
					notificationIDs={ (user.current.notifications || []).reverse() }
					friends={ user.current.friends }
					isDarkTheme={ isDarkTheme }
					visible={ notificationsVisible }
					setVisible={ showNotifications }/>
			</SafeAreaView>
		);
	}

	// ====================== Functions ======================

	// Navigate to game
	function navigateGame(match) {
		props.navigation.navigate('Game', {
			match: match,
			refresh: () => fetchMatches()
		});
	}

	// Fetch user matches
	function fetchMatches() {
		let matches_dict = {};
		let matches_promises = [];

		user.current.matches.forEach(match => {
			let [match_id, enemy_id] = match.split('-');
			enemy_id = enemy_id || 'none';
			matches_dict[enemy_id] = matches_dict[enemy_id] || [];
			matches_dict[enemy_id].push(match_id);
		});

		for (let enemy_id in matches_dict) {
			matches_promises.push(
				Backend.getMatches(enemy_id, matches_dict[enemy_id])
			);
		}

		Promise.all(matches_promises).then(async results => {
			let newMatches = [];
			let oldMatches = [];

			// Sort matches by dates for each opponent
			for (let i in results) {
				results[i].matches.sort((a, b) => {
					let a_time = a[1].updated || 0;
					if (typeof a_time == 'object') a_time = 0;
					if (Util.gameFinished(a[1])) a_time -= new Date().getTime();

					let b_time = b[1].updated || 0;
					if (typeof b_time == 'object') b_time = 0;
					if (Util.gameFinished(b[1])) b_time -= new Date().getTime();

					return b_time - a_time;
				});
			}

			for (let i in results) {
				let j = 0;

				for (; j < results[i].matches.length; j++) {
					if (Util.gameFinished(results[i].matches[j][1])) {
						break;
					}
				}

				if (j != 0 && results[i].enemy.name) {
					let newItems = results[i].matches.splice(0, j);
					newMatches.push({
						enemy: results[i].enemy,
						matches: newItems
					});
				}
			}

			// Sort opponent by latest date
			results.sort((r1, r2) => {
				if (!r1.matches[0]) return -1;
				if (!r2.matches[0]) return 1;

				let r1_time = r1.matches[0][1].updated || 0;
				if (typeof r1_time == 'object') r1_time = 0;

				let r2_time = r2.matches[0][1].updated || 0;
				if (typeof r2_time == 'object') r2_time = 0;

				return r2_time - r1_time;
			});

			for (let i in results) {
				if (results[i].enemy.name) oldMatches.push(results[i]);
				else                       newMatches.push(results[i]);
			}

			let resultMatches = {
				new: newMatches,
				old: oldMatches,
			};

			// Calculate opponent stats
			let opponentsSet = new Set();
			results.forEach(result => {
				let { enemy, matches } = result;
				let stats = new Stats();

				matches.forEach((match, j) => {
					let match_data = match[1];

					let team = (match_data.black == Cache.userID) ? TEAM.B : TEAM.W;
					let lastMove = match_data.moves[match_data.moves.length - 1];
					stats.aggregate(lastMove, team);
				});

				if (enemy.name && enemy.name != 'Computer') {
					opponentsSet.add([enemy, stats]);
				}
			});

			let resultOpponents = [...opponentsSet].sort((a, b) => {
				if (a[0].name < b[0].name)
					return -1;
				if (a[0].name > b[0].name)
					return 1;
				return 0;
			});

			setOpponents(resultOpponents);
			setMatches(resultMatches);

			Cache.home.opponents = resultOpponents;
			Cache.home.matches = resultMatches;

			setRefreshing(false);
		});
	}

	// ====================== Functions ======================

	// Render
	return render();
}


const styles = StyleSheet.create({
	view: {
		alignSelf: 'stretch',
		flex: 1,
	},

		playerScroll: {
			alignItems: 'center',
		},
});
