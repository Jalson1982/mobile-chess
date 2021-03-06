import * as React from 'react';
import { Animated, View, SafeAreaView, ScrollView, StyleSheet, StatusBar, TouchableOpacity, Image, Button, RefreshControl } from 'react-native';
import { ActionBar, WebVibe, TextVibe, ModalVibe, ButtonVibe, DialogVibe } from 'chessvibe/src/widgets';
import AutoHeightImage from 'react-native-auto-height-image';
import SearchBar from 'react-native-search-bar';

import { IMAGE, APP_THEME, FRIEND } from 'chessvibe/src/Const';
import { vw, formatImage } from 'chessvibe/src/Util';
import Backend from 'chessvibe/src/Backend';
import Stats from 'chessvibe/src/Stats';
import { PopupStore } from 'chessvibe/src/redux/Store';

const matchSize = vw(20);
const borderRadius = vw();

// Home Screen
export default function FriendsTab(props) {
	const { isDarkTheme, opponents, friends={} } = props;
	const appTheme = isDarkTheme ? APP_THEME.DARK : APP_THEME.LIGHT;
	let [ searchText, setSearchText ] = React.useState('');

	let viewStyle = [styles.view, props.style, {
		backgroundColor: appTheme.CONTENT_BACKGROUND
	}];

	let Search = isDarkTheme ? SearchDark : SearchLight;

	// opponents.sort((a, b) => {
	// 	let statusA = friends[a[0].user_id] || 0;
	// 	let statusB = friends[b[0].user_id] || 0;
	// 	return statusB - statusA;
	// });

	let people = opponents.map((data, key) => {
		if (searchText != '' && !data[0].name.toLowerCase().includes(searchText.toLowerCase()))
			return null;

		return (
			<FriendItem
				key={ key }
				data={ data }
				appTheme={ appTheme }
				friendStatus={ friends[data[0].user_id] }
				addFriend={ (id) => Backend.requestFriend(id) }
				acceptFriend={ (id) => Backend.acceptFriend(id) }
				onPress={ () => PopupStore.openProfile(data[0]) }/>
		);
	});

	return (
		<SafeAreaView style={ viewStyle }>
			<Search
				appTheme={ appTheme }
				initText={ searchText }
				onSubmit={ (text) => { setSearchText(text) } }
				onDismiss={ () => { setSearchText('') } }/>
			<ScrollView>
				{ people }
			</ScrollView>
		</SafeAreaView>
	);
}

// Hack to get text to change color
function SearchLight(props) { return <SearchInput initText={ props.initText } appTheme={ props.appTheme } onSubmit={ props.onSubmit } onDismiss={ props.onDismiss }/> }
function SearchDark(props) { return <SearchInput initText={ props.initText } appTheme={ props.appTheme } onSubmit={ props.onSubmit } onDismiss={ props.onDismiss }/> }
function SearchInput(props) {
	let { appTheme, onSubmit, onDismiss, initText } = props;
	let [ text, changeText ] = React.useState(initText);
	let ref = React.useRef(null);

	return (
		<SearchBar
			ref={ ref }
			placeholder="Search"
			textColor={ appTheme.COLOR }
			hideBackground={ true }
			onChangeText={ (text) => {
				changeText(text);
				onSubmit(text);
			} }
			onSearchButtonPress={ () => {
				onSubmit(text);
				ref.current.blur();
			} }
			onCancelButtonPress={ () => onDismiss() }
		/>
	);
}

// Friend clickable item on list
function FriendItem(props) {
	let { data, appTheme, onPress, friendStatus, addFriend=()=>{}, acceptFriend=()=>{} } = props;
	let [ enemy, stats ] = data;
	let [ friendState, setFriendState ] = React.useState(friendStatus);

	// Change state when prop changes
	React.useEffect(() => {
		setFriendState(friendStatus);
	},
	[friendStatus, enemy]);

	// Theme colors
	let color = { color: appTheme.COLOR };
	let subColor = { color: appTheme.SUB_COLOR };
	// let btnColor = { backgroundColor: appTheme.MENU_BACKGROUND };

	// Calculate stats
	let { winRate, total } = new Stats(stats).analyze();

	// Action button state
	let disabled = friendState != null && friendState != FRIEND.REQUEST_RECEIVED;

	// Action button style
	let customStyle =
		disabled                               ? '' :
		friendState == FRIEND.REQUEST_RECEIVED ? { backgroundColor: appTheme.ACTION_BUTTON } :
												 { backgroundColor: appTheme.MENU_BACKGROUND };

	// Action button text
	let text =
		friendState == FRIEND.REQUEST_SENT     ? 'Requested' :
		friendState == FRIEND.REQUEST_RECEIVED ? 'Accept Friend' :
		friendState == FRIEND.FRIENDED         ? 'Friend' :
												 '+ Add Friend';

	// Action button config
	let action = friendState == FRIEND.REQUEST_RECEIVED ? acceptFriend : addFriend;
	let actionButton = disabled ?
		(
			<TextVibe style={ [styles.addBtnText] }>{ text }</TextVibe>
		)
		:
		(
			<ButtonVibe
				style={ [styles.addBtn, customStyle] }
				disabled={ disabled }
				onPress={ () => {
					if (friendState == null) setFriendState(FRIEND.REQUEST_SENT);
					if (friendState == FRIEND.REQUEST_RECEIVED) setFriendState(FRIEND.FRIENDED);
					action(enemy.user_id);
				} }>
				<TextVibe style={ [styles.addBtnText, color] }>{ text }</TextVibe>
			</ButtonVibe>
		);

	return (
		<ButtonVibe style={ styles.friendBox } onPress={ onPress }>
			<AutoHeightImage width={ matchSize } source={ formatImage(enemy.photo) } style={ styles.friendImage }/>
			<View style={ styles.friendMiddle }>
				<TextVibe style={ [styles.friendName, color] }>{ enemy.name }</TextVibe>
				<TextVibe style={ [styles.friendStat, subColor] }>Win: { winRate }%</TextVibe>
				<TextVibe style={ [styles.friendStat, subColor] }>Total: { total }</TextVibe>
			</View>
			{ actionButton }
		</ButtonVibe>
	);
}


const styles = StyleSheet.create({
	view: {
		alignSelf: 'stretch',
		flex: 1,
		backgroundColor: '#1a283a',
	},

	friendBox: {
		flexDirection: 'row',
		width: vw(94),
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		marginBottom: vw(3),
		marginHorizontal: vw(3),
	},

		friendImage: {
			borderRadius: vw(),
		},

		friendName: {
			fontSize: vw(5),
			// marginLeft: vw(2),
		},

		friendMiddle: {
			height: matchSize,
			paddingLeft: vw(3),
			flex: 1,
		},

			friendStat: {
				color: 'grey',
			},

		addBtn: {
			backgroundColor: 'black',
			padding: vw(2),
		},

			addBtnText: {
				fontSize: vw(5),
				color: 'grey',
			},
});
