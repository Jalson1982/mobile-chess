import * as React from 'react';
import { Switch, Animated, View, SafeAreaView, ScrollView, StyleSheet, StatusBar, TouchableOpacity, Image, Button, RefreshControl } from 'react-native';
import { ActionBar, WebVibe, TextVibe, ModalVibe, ButtonVibe, DialogVibe } from 'chessvibe/src/widgets';
import AutoHeightImage from 'react-native-auto-height-image';

import { URL, TEAM, IMAGE, STORAGE_IS_DARK_THEME, APP_THEME } from 'chessvibe/src/Const';
import Util, { formatDate, vw, wh } from 'chessvibe/src/Util';
import Storage from 'chessvibe/src/Storage';
import Cache from 'chessvibe/src/Cache';
import Backend from 'chessvibe/src/Backend';
import SideMenu from 'react-native-side-menu'
import { HomeStore } from 'chessvibe/src/redux/Store';
import { useSelector } from 'react-redux';

import ReportModal from './ReportModal';
import AboutModal from './AboutModal';

const matchSize = vw((100 - 2 - 6 - 4) / 4);
const borderRadius = vw();

// Home Screen
export default function SettingsTab(props) {
	const { isDarkTheme } = props;
	const appTheme = isDarkTheme ? APP_THEME.DARK : APP_THEME.LIGHT;
	const [ repotModalShown, showReportModal ] = React.useState(false);
	const [ aboutModalShown, showAboutModal ] = React.useState(false);

	let viewStyle = [styles.view, props.style, {
		backgroundColor: appTheme.CONTENT_BACKGROUND
	}];

	let borderStyle = {
		height: 1,
		backgroundColor: appTheme.SETTING_BORDER,
	};

	return (
		<View style={ viewStyle }>
			<ScrollView>
				<View style={ styles.divider }/>

				<View style={ borderStyle }/>

					<SwitchSetting
						title={ 'Dark Theme' }
						initEnabled={ isDarkTheme }
						appTheme={ appTheme }
						onChange={ (enabled) => {
							HomeStore.setIsDarkTheme(enabled);
							Storage.set(STORAGE_IS_DARK_THEME, enabled + '');
						} }/>
					<View style={ borderStyle }/>
					<SwitchSetting
						title={ 'Push Notification' }
						enabled={ true }
						appTheme={ appTheme }/>

				<View style={ borderStyle }/>

				<View style={ styles.divider }/>

				<View style={ borderStyle }/>

					<MoreSetting
						title={ 'Report Issues' }
						type={ 'more' }
						isDarkTheme={ isDarkTheme }
						onPress={ () => showReportModal(true) }/>

					<View style={ borderStyle }/>

					<MoreSetting
						title={ 'About' }
						type={ 'more' }
						isDarkTheme={ isDarkTheme }
						onPress={ () => showAboutModal(true) }/>

				<View style={ borderStyle }/>
			</ScrollView>

			<ReportModal
				isDarkTheme={ isDarkTheme }
				isVisible={ repotModalShown }
				onDismiss={ () => showReportModal(false) }/>

			<AboutModal
				isDarkTheme={ isDarkTheme }
				isVisible={ aboutModalShown }
				onDismiss={ () => showAboutModal(false) }/>
		</View>
	);
}

function SwitchSetting(props) {
	const { title, appTheme, initEnabled=false, type='switch', onChange=()=>{} } = props;
	const [ enabled, setEnabled ] = React.useState(initEnabled);

	// Update enable state
	React.useEffect(() => {
		setEnabled(initEnabled);
	},
	[initEnabled]);

	// Toggle switch enable
	const toggleSwitch = () => {
		setEnabled(!enabled);
		onChange(!enabled);
	};

	// Render
	let settingStyle = [styles.setting, {
		backgroundColor: appTheme.SETTING_BACKGROUND,
		borderColor: appTheme.SETTING_BORDER,
	}];

	let textStyle = [styles.settingText, {
		color: appTheme.COLOR,
	}];

	if (type == 'switch') {
		return (
			<View style={ settingStyle }>
				<TextVibe style={ textStyle }>{ title }</TextVibe>
				<Switch
					onValueChange={ toggleSwitch }
					trackColor={{ false: "#767577", true: "#81b0ff" }}
					value={ enabled }
					style={ styles.settingBtn }/>
			</View>
		);
	}
}


function MoreSetting(props) {
	const { title, isDarkTheme, onPress=() => {} } = props;
	const appTheme = isDarkTheme ? APP_THEME.DARK : APP_THEME.LIGHT;

	let settingStyle = [styles.setting, {
		backgroundColor: appTheme.SETTING_BACKGROUND,
		borderColor: appTheme.SETTING_BORDER,
	}];

	let textStyle = [styles.settingText, {
		color: appTheme.COLOR,
	}];

	return (
		<ButtonVibe style={ settingStyle } onPress={ onPress }>
			<TextVibe style={ textStyle }>{ title }</TextVibe>
			<Image source={ IMAGE[isDarkTheme ? 'BACK' : 'BACK_DARK'] } style={ [styles.settingsIcon,  {transform: [{ scaleX: -1 }]}] }/>
		</ButtonVibe>
	);
}


const styles = StyleSheet.create({
	view: {
		alignSelf: 'stretch',
		flex: 1,
	},

		setting: {
			padding: vw(3),
			paddingHorizontal: vw(4),
			flexDirection: 'row',
			alignItems: 'center',
			// borderBottomWidth: 1,
			borderRadius: 0,
		},

		settingsIcon: {
			width: vw(7),
			height: vw(7),
		},

		settingText: {
			flex: 1,
			fontSize: vw(5),
			color: 'white',
		},

		settingBtn: {
			// alignSelf: 'flex-end',
		},

	divider: {
		height: vw(10),
	},
});
