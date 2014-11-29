"use strict";

// Graphic controller of the Shif-box (especially buttons & tooltiptexts)
SHB.ns(function() {

SHB.Controllers = 
{
	bubbleMode : null, // Bubbles display mode (see Options)
	
	// Initialization with user preferences
	Init : function () {
		var prefs = SHB.Cc["@mozilla.org/preferences-service;1"].getService(SHB.Ci.nsIPrefService).getBranch("extensions.Shift-Box.");
		this.bubbleMode = prefs.getIntPref('notifications');
		
		var prefSize = prefs.getIntPref('buttonsSize');
		SHB_Options.UpdateButtonsSize(document.getElementsByTagName('toolbarbutton'), prefSize); // A réorganiser 
		SHB_Options.UpdateBubbleSize(document.getElementById('Button-Play-Label'), prefSize);    //
		SHB_Options.UpdateBubbleSize(document.getElementById('Button-Stop-Label'), prefSize);	 // 
		SHB_Options.UpdateBubbleSize(document.getElementById('Button-Speedup-Label'), prefSize);   //
		SHB_Options.UpdateBubbleSize(document.getElementById('Button-Speeddown-Label'), prefSize);   //
				
		new PopupEventsHandler(document.getElementById(SHB.SB_PREV_MAIL));
		new PopupEventsHandler(document.getElementById(SHB.SB_NEXT_MAIL));
	},
	
	// Modify bubbles display depending on the mode choosen by the user (see Options)
	BubbleNotifications : function(mode) {	
		this.bubbleMode = mode;
		switch (mode) {
			case SHB.NO_NOTIFY:	// No bubbles
				document.getElementById("Button-Play-Label").setAttribute("class", "Button-Label-hidden");
				document.getElementById("Button-Speeddown-Label").setAttribute("class", "Button-Label-hidden");
				document.getElementById("Button-Speedup-Label").setAttribute("class", "Button-Label-hidden");
				document.getElementById("Button-Stop-Label").setAttribute("class", "Button-Label-hidden");
				break;
				
			case SHB.BIN_NOTIFY: // Only an empty bubble (no items count, disable it)
				document.getElementById('SB_play').setAttribute('notifyNumber', null);	
				document.getElementById('SB_speedDown').setAttribute('notifyNumber', null);	
				document.getElementById('SB_stop').setAttribute('notifyNumber', null);
				break;
				
			case SHB.COUNT_NOTIFY:	// Bubble and items count
				break;
		}
	},
	
	// Display different buttons (css attributes, activation, ...)
	DisablePlay : function() {
		var playBtn = document.getElementById('SB_play');
		playBtn.setAttribute('disabled', 'true');
		playBtn.setAttribute('class', 'bDPause');
		playBtn.removeEventListener('command', SHB.Manager.Play, false);
		document.getElementById("Button-Play-Label").setAttribute("class", "Button-Label-hidden");
	},
	
	EnablePlay : function() {
		var playBtn = document.getElementById('SB_play');
		playBtn.setAttribute('disabled', 'false');
		playBtn.setAttribute('class', 'bPause');
		playBtn.addEventListener('command', SHB.Manager.Play, false);
	},
	
	DisableStop : function(){
		var stop=document.getElementById("SB_stop");
		stop.setAttribute("tooltiptext", null);
		stop.setAttribute("disabled",true);
		stop.setAttribute("class", "bDStop");
		stop.removeEventListener('command', SHB.Manager.Stop, false);
		document.getElementById("Button-Stop-Label").setAttribute("class", "Button-Label-hidden");
		//document.getElementById('SB_stopMenu').hidden = true;
	},
	
	EnableStop : function () {
		var stop=document.getElementById("SB_stop");
		stop.setAttribute("disabled",false);
		stop.setAttribute("class", "bStop");
		stop.addEventListener('command', SHB.Manager.Stop, false);
		//document.getElementById('SB_stopMenu').hidden = false;
	},
	
	DisablePrevMail : function(){
		var prevMail=document.getElementById("SB_prevMail");
		prevMail.setAttribute("disabled",true);
		prevMail.setAttribute("tooltiptext", null);
		prevMail.setAttribute("class", "bDPrevMail");
		prevMail.removeEventListener('click', SHB.Manager.PreviousMail, false);
	},
	
	EnablePrevMail : function () {
		var prevMail=document.getElementById("SB_prevMail");
		prevMail.setAttribute("disabled",false);
		prevMail.setAttribute("class", "bPrevMail");
		prevMail.addEventListener('click', SHB.Manager.PreviousMail, false);
	},	
	
	DisableNextMail : function(){
		var nextMail=document.getElementById("SB_nextMail");
		nextMail.setAttribute("disabled",true);
		nextMail.setAttribute("tooltiptext", null);
		nextMail.setAttribute("class", "bDNextMail");
		nextMail.removeEventListener('click', SHB.Manager.NextMail, false);
	},
	
	EnableNextMail : function () {
		var nextMail=document.getElementById("SB_nextMail");
		nextMail.setAttribute("disabled",false);
		nextMail.setAttribute("class", "bNextMail");
		nextMail.addEventListener('click', SHB.Manager.NextMail, false);
	},	
	
	/* Speed buttons
			- <Disable>/<Enable> : user actions (click)
			- <Update> : number (label 'x2', 'x4', ...)
			- <Clear> : disable those buttons (event) and hide the number (label) 
	*/
	DisableSpeedDown : function(){
		var speedDown=document.getElementById("SB_speedDown");
		speedDown.setAttribute("disabled",true);
		speedDown.setAttribute("class", "bDSpeedbackward");
		speedDown.removeEventListener('click', SHB.Manager.SpeedDown, false);
	},
	
	EnableSpeedDown : function () {
		var speedDown=document.getElementById("SB_speedDown");
		speedDown.setAttribute("disabled",false);
		speedDown.setAttribute("class", "bSpeedbackward");
		speedDown.addEventListener('click', SHB.Manager.SpeedDown, false);
	},
	
	UpdateSpeedDown : function(n) {
		if (n == 0) {
			document.getElementById("Button-Speeddown-Label").setAttribute("class", "Button-Label-hidden");
		}
		else if (this.bubbleMode != SHB.NO_NOTIFY) {
			document.getElementById("Button-Speeddown-Label").setAttribute("class", "Button-Speed-Label");
			
			if (this.bubbleMode == SHB.COUNT_NOTIFY) {
				document.getElementById('SB_speedDown').setAttribute('notifyNumber', 'x' + n);	
			}
		}
	},
	
	DisableSpeedUp : function() {
		var speedUp=document.getElementById("SB_speedUp");
		speedUp.setAttribute("disabled",true);
		speedUp.setAttribute("class", "bDSpeed");
		speedUp.removeEventListener('click', SHB.Manager.SpeedUp, false);
	},
	
	EnableSpeedUp: function () {
		var speedUp=document.getElementById("SB_speedUp");
		speedUp.setAttribute("disabled",false);
		speedUp.setAttribute("class", "bSpeed");
		speedUp.addEventListener('click', SHB.Manager.SpeedUp, false);
	},
	
	UpdateSpeedUp : function(n) {	
		if (n == 0) {
			document.getElementById("Button-Speedup-Label").setAttribute("class", "Button-Label-hidden");
		}
		else if (this.bubbleMode != SHB.NO_NOTIFY) {
			document.getElementById("Button-Speedup-Label").setAttribute("class", "Button-Speed-Label");	
			
			if (this.bubbleMode == SHB.COUNT_NOTIFY) {
				document.getElementById('SB_speedUp').setAttribute('notifyNumber', 'x' + n);	
			}
		}
	},
	
	DisableAll : function() {
		if (!SHB.Manager.bufferedMsges) {
			this.DisableStop();
		}
		
		this.DisablePlay();
		this.ClearSpeedButtons();
		this.DisablePrevMail();
		this.DisableNextMail();
	},
	
	ClearSpeedButtons : function() {
		this.DisableSpeedUp();
		this.DisableSpeedDown();
		this.UpdateSpeedDown(0);
		this.UpdateSpeedUp(0);
	},
	
	MajPlay : function (state, n) {
		var bouton=document.getElementById("SB_play");
		if(state != SHB.STATE_PAUSE) {
			bouton.setAttribute("class","bPause");
		}
		else {
			bouton.setAttribute("class","bPlay");
		}
		this.ButtonTooltip(SHB.SB_PLAY, n, 0);
	},
	
	MajStop : function(state) {
		var bouton=document.getElementById("SB_stop");
		if(state == SHB.STATE_PLAY) {
			this.EnableStop();
		}
		else {
			this.DisableStop();			
		}
	},
		
	UpdateCountPlay : function (countPlay) {
		if (countPlay == -1) {
			document.getElementById("Button-Play-Label").setAttribute("class", "Button-Label-hidden");
		}
		else if (this.bubbleMode == SHB.BIN_NOTIFY) {
			// Enable an empty bubble
			document.getElementById("Button-Play-Label").setAttribute("class", "Button-Play-Label-sup10");
		}
		else if (this.bubbleMode == SHB.COUNT_NOTIFY) {
			// Enable the bubble using an appropriate class depending on the count value
			if (countPlay < 10) {
				document.getElementById("Button-Play-Label").setAttribute("class", "Button-Play-Label");
			} 
			else if (countPlay < 100) {
				document.getElementById("Button-Play-Label").setAttribute("class", "Button-Play-Label-sup10");
			}
			else if (countPlay < 1000) {
				document.getElementById("Button-Play-Label").setAttribute("class", "Button-Play-Label-sup100");
			}	
			else {
				var label = document.getElementById("Button-Play-Label");
				label.setAttribute("class", "Button-Play-Label-sup1000");
				
				if (label.getAttribute('iconesize') != 'large') {
					countPlay = '+' + Math.floor(countPlay / 1000) + 'K'; // Reducing width of label if necessary
				}
			}	
			
			// Update the play count value 
			document.getElementById('SB_play').setAttribute('notifyNumber', countPlay);	
		}
	},
			
	UpdateBufferedMsges: function (n) {
		if (n == 0) {
			document.getElementById("Button-Stop-Label").setAttribute("class", "Button-Label-hidden");
		}
		else if (this.bubbleMode == SHB.BIN_NOTIFY) {
			document.getElementById("Button-Stop-Label").setAttribute("class", "Button-Stop-Label-inf10");
		}
		else if (this.bubbleMode == SHB.COUNT_NOTIFY) {
			if (n < 10) {
				document.getElementById("Button-Stop-Label").setAttribute("class", "Button-Stop-Label-inf10");
			} 
			else {
				document.getElementById("Button-Stop-Label").setAttribute("class", "Button-Stop-Label");
			}
			
			document.getElementById('SB_stop').setAttribute('notifyNumber', n);
		}
	},
	
	/*
	* Update a popup menu (previous or next mail button)
	* <btn> : Previous or next button
	* <list> : an array of objects {message subject, position} to add to menu 
	*/
	UpdatePopupMenu: function(btn, list, todayNb, sessionNb) {
		var menu;		// Popup menu
		
		if (btn == SHB.PREVIOUS) {
			menu = document.getElementById('SB_prevMenu');
			
			var bundle = document.getElementById("SB_strings");
			todayNb = bundle.getFormattedString("SB_replay_today", [todayNb]); // Array of parameters
			sessionNb = bundle.getFormattedString("SB_replay_session", [sessionNb]);
			
			document.getElementById('SB_replay_today').label = todayNb;
			document.getElementById('SB_replay_session').label = sessionNb;
		}
		else {
			menu = document.getElementById('SB_nextMenu');
		}
		
		// Deleting old items except the ones before the menu separator (items used to go come back to the beginning and to the previous mail)
		while (menu.lastChild.getAttribute('value') != 'sep') { 
			menu.removeChild(menu.lastChild);
		}
		
		// Updating items
		for (var i = 0, c = list.length; i < c; i++) {
			var item = document.createElement('menuitem');
			item.setAttribute('label', list[i].subject);
			
			// Short cuts labels (page down/up)
			if (i == 0 && btn == SHB.PREVIOUS) {
				item.setAttribute('acceltext', 'ALT+PAGE UP');
			}
			else if (i == c - 1 && btn == SHB.NEXT) {
				item.setAttribute('acceltext', 'ALT+PAGE DOWN');
			}
			
			// Closure for events
			var f = function(btn, position) {
						return function () { SHB.Manager.SelectMessage(btn, position); };
					};
			
			item.addEventListener('mousedown', f(btn, list[i].position), false);
			item.addEventListener('mouseup', f(btn, list[i].position), false);
			
			menu.appendChild(item);
		}
	},
	
	/* 
	* Update button tooltiptext 
	* <btn> : Previous/Next mail or play button
	* <n> : Number of previous/next/unread messages
	* <lastMsge> : Previous or next message
	*/
	ButtonTooltip : function(btn, n, lastMsge) {
		if (n == -1) {
			document.getElementById(btn).setAttribute('tooltiptext', null); // Disable tooltip
		}
		else {
			// Display previous/next messages count (using entities from overlay.properties for translation in other languages)
			var bundle = document.getElementById("SB_strings");
			var label = "";
			
			if (btn == SHB.SB_PLAY) {	
				var aDate = new Date(lastMsge.date / 1000);
				if (n != null) {
					label = bundle.getFormattedString("SB_playTooltip", [n]); // Array of parameters
				}
				else {
					label = bundle.getFormattedString("SB_pauseTooltip", []);
				}
				
				if (lastMsge) {
					label += '\n' + bundle.getFormattedString("SB_lastDate", [aDate.toLocaleDateString()]); 
				}
				document.getElementById(btn).setAttribute('tooltiptext', label);
			}
			else {
				if (!lastMsge ) {
					document.getElementById(btn).setAttribute('tooltiptext', null); // Disable tooltip
				} 
				else {		
					if (btn == SHB.SB_STOP) {	
						var aDate = new Date(lastMsge.date / 1000);
						label = bundle.getFormattedString("SB_stopTooltip", [n]);
						label += '\n' + bundle.getFormattedString("SB_lastReceivedMsge", [aDate.toLocaleDateString()]);
					}
					else if (btn == SHB.SB_PREV_MAIL) {
						label = bundle.getFormattedString("SB_prevTooltip", [n, lastMsge.mime2DecodedSubject]);
					}
					else if (btn == SHB.SB_NEXT_MAIL) {
						label = bundle.getFormattedString("SB_nextTooltip", [n, lastMsge.mime2DecodedSubject]);
					}
					document.getElementById(btn).setAttribute('tooltiptext', label);
				}
			}
		}
	},
	
	LabelContextMenu : function(n) {
		var bundle = document.getElementById("SB_strings");
		
		document.getElementById('SB_replay_from').setAttribute('label', bundle.getFormattedString('SB_replay_from', [n]));
	}
};

SHB.Controllers.Init();

// Function that handle popup menu events (for previous and next mail button)
function PopupEventsHandler(element) {		
	this.MousedownHandler = function (aEvent) {
		if (aEvent.button != 0 || aEvent.currentTarget.open || aEvent.currentTarget.disabled)
			return;

		aEvent.currentTarget.firstChild.hidden = true; // Prevent the menupopup from opening immediately
				
		// Callback					
		this.timer = SHB.Cc["@mozilla.org/timer;1"].createInstance(SHB.Ci.nsITimer);
		this.timer.initWithCallback((function(a, timer) {
										return function() {  // Open popup, and reset timer
													a.firstChild.hidden = false;
													a.open = true;
													timer = null; 
												};				
									})(aEvent.currentTarget, this.timer), SHB.TIMEOUT_POPUP, SHB.Ci.nsITimer.TYPE_ONE_SHOT);
	},
	
	this.StopTimer = function (aEvent) {
		if (this.timer) {
			this.timer.cancel();
			this.timer = null;
		}
	}
		
	// Init
	element.addEventListener("mousedown", this.MousedownHandler, true);
	element.addEventListener("mouseup", this.StopTimer, false);
	element.addEventListener("mouseout", this.StopTimer, false);
}

});
