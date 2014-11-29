"use strict";

SHB.ns(function() {

Components.utils.import("resource:///modules/gloda/public.js"); 

// document.getElementById('messagepane').addEventListener('load', function() { alert('LOADED'); }, true);


function Folder (sourceFolders)
{
	this.state = SHB.STATE_WAIT; 	// Current state of the Shift-Box for this folder
	this.listDates = null; 			// Array that contains dates of displayable messages (right folders and intevals)
	this.cursor = -1; 				// Index of listDates corresponding with the last displayed message. -1 means that the list is empty.
	this.bufferedMsges = 0;			// Buffered messages count (red bubble)
	this.startDate = null;
	this.source = sourceFolders;
	
	// Folder updating with the new selected source folder
	this.Update = function(startDate) {
		if (this.state == SHB.STATE_WAIT) {
			this.startDate = (startDate ? startDate : SHB.Manager.startDate);
		}
		
		SHB.VirtualFolder.Initialisation(this.source); 
		
		this.listDates = SHB.VirtualFolder.GetListDateMsg(this.startDate, SHB.Manager.endDate);
		
		if (!this.listDates.length) {				
			this.cursor = -1;						
		}
	};
	
	// Set cursor to the right position (on the list of dates) corresponding with <date>
	this.SetCursor = function (date) {
		var i = 0;
		while(i <= this.listDates.length - 1 && this.listDates[i] < date) {
			i++;	
		}
		while (this.listDates[i] == this.listDates[i + 1] && i < this.length) {
			// loop that avoids troubles when there are duplicated mails (same date)
			i++;
		}
		this.cursor = i;
	};
	
	// Get
	this.PlaybackMsgesCount = function() {
		return (this.listDates ? this.listDates.length - this.cursor - 1 : -1);
	};
	
	this.Update();
}

SHB.Manager = 
{
	folders:[],				// Map : URI -> Object <Folder>
	selectedFolder:null,	// The folder that was selected before launching the Shift-box
	folderURI:"",			// Selected folder URI
	timer:null, 			// Timer
	interval:0, 			// Duration (ms) between 2 displays of a new message 
	systemTime:0,			// Date (in microseconds) when Thunderbird was launched
	today:0,				// Date today (microseconds)
	startDate:null,			// Lower bound used to display only some messages 
	endDate:null,

	// Function called to update the graphical interface (i.e buttons) depending on the selected folder
	InitGUI : function() {
		// Reset variables
		this.interval = SHB.DEFAULT_DISPLAY_TIME;
		
		var folderSB = this.folders[this.folderURI];
		SHB.Controllers.MajPlay(folderSB.state, folderSB.PlaybackMsgesCount() + 1);
		
		// Tooltips
		var prevMsge = SHB.VirtualFolder.GetMessageAt(folderSB.cursor);
		var nextMsge = SHB.VirtualFolder.GetMessageAt(folderSB.cursor + 1); 
		SHB.Controllers.ButtonTooltip(SHB.SB_PREV_MAIL, folderSB.cursor + 1, prevMsge); 
		SHB.Controllers.ButtonTooltip(SHB.SB_NEXT_MAIL, folderSB.PlaybackMsgesCount() + 1, nextMsge); 
		
		// Disable speed buttons events and hide labels
		SHB.Controllers.ClearSpeedButtons(); 
	
		// Buttons 
		// If the INBOX is not empty, enable previous mail
		if (folderSB.cursor != -1) {
			SHB.Controllers.EnablePrevMail();
			this.UpdatePopupItems(SHB.PREVIOUS);
		} 
		else {
			SHB.Controllers.DisablePrevMail();
		}
		
		// If
		if (folderSB.listDates.length && folderSB.listDates.length != folderSB.cursor + 1) {
			SHB.Controllers.EnableNextMail();
			this.UpdatePopupItems(SHB.NEXT);
		}
		else {
			SHB.Controllers.DisableNextMail();
		}
			
		if (folderSB.state == SHB.STATE_WAIT) {
			SHB.Controllers.DisableStop();
			SHB.Controllers.UpdateCountPlay(-1);
			document.getElementById("threadTree").setAttribute("style", this.bgcolorThread); // Displays default background color
		}
		else {
			SHB.Controllers.EnableStop();
			SHB.Controllers.UpdateBufferedMsges(folderSB.bufferedMsges); // If there are buffered messages, update red bubble. Otherwise disable the Stop button
			SHB.Controllers.UpdateCountPlay(folderSB.PlaybackMsgesCount());
			document.getElementById("threadTree").setAttribute("style", "background-color:" + SHB.BUFFER_MODE_COLOR); 
		}
	},
		
	// New mail received handler. Used to display the received message or place it in a buffer (red bubble)
	NewMailHandler : function(msge) {
		if (!SHB.Manager.folders[msge.folder.URI]) {
			SHB.Manager.NewShbFolder(msge.folder);
		}
		
		var buffFolder = SHB.Manager.folders[msge.folder.URI];
		
		if (buffFolder.state != SHB.STATE_WAIT) { // The Shift-Box is paused or is reading a folder	
			buffFolder.bufferedMsges++;
			
			if (buffFolder == SHB.Manager.folders[SHB.Manager.folderURI]) {
				SHB.Controllers.EnableStop();
				SHB.Controllers.UpdateBufferedMsges(buffFolder.bufferedMsges); 
				SHB.Controllers.ButtonTooltip(SHB.SB_STOP, buffFolder.bufferedMsges, msge);
				buffFolder.Update();
			}
		}
		else { // Waiting for new messages, present day -> just update the Shift-box folder (no buffering)
			if (SHB.Manager.folderURI == msge.folder.URI) {
				buffFolder.Update();	
				SHB.VirtualFolder.UpdateSearchTerms(msge.date, SHB.BORNESUP, true);
			}
		}
		
		// Check the virtual parent folder to buffer this message if necessary
		for (var i = 0, c = gFolderTreeView._rowMap.length; i < c; i++) {				
			var parentFolder = gFolderTreeView._rowMap[i]._folder; 
			if (parentFolder.getFlag(SHB.Ci.nsMsgFolderFlags.Virtual)) { // Parent virtual folder
				var sourceFolders = VirtualFolderHelper.wrapVirtualFolder(parentFolder).dbFolderInfo.getCharProperty("searchFolderUri");
					
				// If this virtual folder contains the received message folder
				if (sourceFolders && sourceFolders.indexOf(msge.folder.URI) != -1) {
					if (SHB.Manager.folders[parentFolder.URI] && SHB.Manager.folders[parentFolder.URI].state != SHB.STATE_WAIT) {
							SHB.Manager.folders[parentFolder.URI].bufferedMsges++;
					}					
				}
			}
		}
	},
	
	// Displays mails one by one
	Handler_MailByMail : function () {			
		var folderSB = SHB.Manager.folders[SHB.Manager.folderURI];
		var cursor = folderSB.cursor;
		
		cursor++;
		
		// We store the last date indicated by <cursor> before updating our list
		var oldTargetedDate = folderSB.listDates[cursor];
		
		folderSB.SetCursor(oldTargetedDate);
		
		if (cursor == 0) {
			SHB.Controllers.EnablePrevMail();
		}
		if (cursor == folderSB.listDates.length - 1) {
			SHB.Controllers.DisableNextMail();
		} 
		
		if(cursor!=-1) {
			// Non-empty list
			if(cursor <= folderSB.listDates.length-1) {
				var date = folderSB.listDates[cursor];
			//	SHB.VirtualFolder.UpdateSearchTerms(folderSB.listDates[0],SHB.BORNEINF,false);
				SHB.VirtualFolder.UpdateSearchTerms(date,SHB.BORNESUP,true);
				SHB.VirtualFolder.SelectLastMessage(SHB.NEXT, cursor);
				
				// Tooltips
				var msgesCount = folderSB.PlaybackMsgesCount();
				var prevMsge = SHB.VirtualFolder.GetMessageAt(cursor);
				var nextMsge = SHB.VirtualFolder.GetMessageAt(cursor + 1);
				SHB.Controllers.ButtonTooltip(SHB.SB_PREV_MAIL, cursor + 1, prevMsge); 	
				SHB.Controllers.ButtonTooltip(SHB.SB_NEXT_MAIL, msgesCount, nextMsge); 										
				SHB.Controllers.ButtonTooltip(SHB.SB_PLAY, msgesCount, prevMsge);	
			}
						
			SHB.Controllers.UpdateCountPlay(msgesCount);
		}	
		
		if(cursor >= folderSB.listDates.length - 1) {
			// State : current time. Waiting for new messages (play mode)
			document.getElementById("Button-Play-Label").setAttribute("class", "Button-Label-hidden");
			document.getElementById("threadTree").setAttribute("style", SHB.Manager.bgcolorThread);
			SHB.Manager.timer.cancel();
			SHB.Manager.interval = SHB.DEFAULT_DISPLAY_TIME; // Reset interval
			folderSB.state = SHB.STATE_WAIT;
			SHB.Controllers.MajStop(SHB.STATE_PAUSE);
			SHB.Controllers.ButtonTooltip(SHB.SB_PLAY, -1, null);	
			SHB.Controllers.ClearSpeedButtons();
		}
	},
		
	// Pause the Shift-Box
	Pause : function() {
		var folderSB = SHB.Manager.folders[SHB.Manager.folderURI];
		
		// Needless to pause if it is the present day (waiting for messages)
		if (folderSB.state != SHB.STATE_WAIT) {
			SHB.Manager.timer.cancel();
			SHB.Manager.interval = SHB.DEFAULT_DISPLAY_TIME;
			folderSB.state = SHB.STATE_PAUSE;
			SHB.Controllers.MajPlay(SHB.STATE_PAUSE);
			SHB.Controllers.ClearSpeedButtons();
			document.getElementById("threadTree").setAttribute("style", "background-color:" + SHB.BUFFER_MODE_COLOR); 
		}
	},
	
	// Stop, reset the Shift-Box and select the old folder
	Stop : function() { 
		SHB.Controllers.UpdateCountPlay(-1); // Hide playback messages count label
		SHB.Controllers.DisableStop();
		
		var Manager = SHB.Manager;
		var folderSB = Manager.folders[Manager.folderURI];
	//	gFolderDisplay.show(MailUtils.getFolderForURI(Manager.folderURI));
		
		if (folderSB.bufferedMsges) { 
			// Update interface & play new received mails
			Manager.timer.cancel();
			Manager.interval = SHB.DEFAULT_DISPLAY_TIME;
			folderSB.state = SHB.STATE_PAUSE;			
			SHB.Controllers.ClearSpeedButtons();	
			SHB.Controllers.UpdateCountPlay(folderSB.bufferedMsges);

			folderSB.Update();	
			var lastMsgeIndx = folderSB.listDates.length - folderSB.bufferedMsges - 1;
			
			SHB.VirtualFolder.UpdateSearchTerms(folderSB.listDates[lastMsgeIndx], SHB.BORNESUP, true);
			SHB.VirtualFolder.SelectLastMessage(SHB.NEXT, lastMsgeIndx);
			folderSB.SetCursor(folderSB.listDates[lastMsgeIndx]); // Position à la fin des playback mails			
			folderSB.bufferedMsges = 0;
			Manager.Play();
		}
		else {		
			folderSB.state = SHB.STATE_WAIT;
			
			if (folderSB.listDates.length) {
				folderSB.SetCursor(folderSB.listDates[folderSB.listDates.length - 1]);
			}
			else {
				folderSB.cursor = -1;
			}
			
			SHB.VirtualFolder.UpdateSearchTerms(folderSB.listDates[folderSB.listDates.length - 1], SHB.BORNESUP, true);
			Manager.Reset();
		}
	},

	// Just reset
	Reset : function() {
		this.timer.cancel();
		
		var folderSB = SHB.Manager.folders[SHB.Manager.folderURI];
		
		SHB.VirtualFolder.UpdateSearchTerms(this.startDate, SHB.BORNEINF, false);
		
		if (folderSB.listDates.length && folderSB.state == SHB.STATE_WAIT) {
			folderSB.SetCursor(folderSB.listDates[folderSB.listDates.length - 1]);
			SHB.VirtualFolder.UpdateSearchTerms(folderSB.listDates[folderSB.listDates.length - 1], SHB.BORNESUP, true);
		}
		else {
			SHB.VirtualFolder.UpdateSearchTerms(folderSB.listDates[folderSB.cursor], SHB.BORNESUP, true);
		}		
		
		this.InitGUI();
		var folder = MailUtils.getFolderForURI(SHB.Manager.folderURI);
		document.getElementById('tabmail').tabContainer.firstChild.label = folder.name + ' - ' + folder.rootFolder.name;	
	},
		
	// Display the previous message
	PreviousMail : function(event) { 
		var Manager = SHB.Manager;
		
		// Check if the popup is not opened
		if (event==null || event.button == 0 && event.target == event.currentTarget && !event.currentTarget.open && !event.currentTarget.disabled) {	
			Manager.timer.cancel();
			Manager.interval = SHB.DEFAULT_DISPLAY_TIME;
			
			var folderSB = Manager.folders[Manager.folderURI];
			
			if(folderSB.cursor >= 0){				
				folderSB.state = SHB.STATE_PAUSE;
				SHB.Controllers.MajPlay(SHB.STATE_PAUSE);
				SHB.Controllers.MajStop(SHB.STATE_PLAY);
				SHB.Controllers.ClearSpeedButtons();
			
				document.getElementById("threadTree").setAttribute("style", "background-color:" + SHB.BUFFER_MODE_COLOR); 
				
				var msgesCount;
				if(folderSB.cursor == 0){ 
					folderSB.cursor = -1;
					gFolderDisplay.clearSelection();
					//SHB.VirtualFolder.UpdateSearchTerms(0,SHB.BORNEINF,false);
					SHB.VirtualFolder.UpdateSearchTerms(0,SHB.BORNESUP,true);
					SHB.Controllers.DisablePrevMail();
					SHB.Controllers.ButtonTooltip(SHB.SB_PREV_MAIL, -1, null); 
					msgesCount = folderSB.listDates.length;
				}
				else {
					folderSB.cursor--;

					var date = folderSB.listDates[folderSB.cursor] + 1;
					SHB.VirtualFolder.SelectLastMessage(SHB.PREVIOUS, folderSB.cursor);
					SHB.VirtualFolder.UpdateSearchTerms(date,SHB.BORNESUP,true); // folder.Display ?! 
					SHB.Controllers.EnablePrevMail();
					
					// Tooltips
					msgesCount = folderSB.PlaybackMsgesCount();
					var lastMsge = SHB.VirtualFolder.GetMessageAt(folderSB.cursor);
					SHB.Controllers.ButtonTooltip(SHB.SB_PREV_MAIL, folderSB.cursor + 1, lastMsge);
					SHB.Controllers.ButtonTooltip(SHB.SB_PLAY, msgesCount, lastMsge);	
				}
				
				SHB.Controllers.ButtonTooltip(SHB.SB_NEXT_MAIL, msgesCount, SHB.VirtualFolder.GetMessageAt(folderSB.cursor + 1)); 
				SHB.Controllers.UpdateCountPlay(msgesCount);
				SHB.Controllers.EnableNextMail();
			}
		}
	},
	
	// Double reading speed
	SpeedUp : function() {
		SHB.Manager.timer.cancel();
		SHB.Manager.interval /= 2; // More msges per second
		SHB.Controllers.EnableSpeedDown();
		
		if (SHB.Manager.interval > SHB.DEFAULT_DISPLAY_TIME) {
			// We just decrease the speed backward label
			SHB.Controllers.UpdateSpeedDown(SHB.Manager.interval / SHB.DEFAULT_DISPLAY_TIME);
		}
		else {
			// Increase speed up label
			SHB.Controllers.UpdateSpeedDown(0);
			
			if (SHB.Manager.interval == SHB.DEFAULT_DISPLAY_TIME) {
				// Default interval, no label displayed
				SHB.Controllers.UpdateSpeedUp(0);
			} 
			else {
				SHB.Controllers.UpdateSpeedUp(SHB.DEFAULT_DISPLAY_TIME / SHB.Manager.interval);
			}
		}
			
		// Max speed
		if (SHB.Manager.interval == SHB.DEFAULT_DISPLAY_TIME / SHB.N_CHOICE_SPEED) {
			SHB.Controllers.DisableSpeedUp();
		}
		
		SHB.Manager.timer.initWithCallback(SHB.Manager.Handler_MailByMail, SHB.Manager.interval, SHB.Ci.nsITimer.TYPE_REPEATING_SLACK);
	},

	// Play/pause button event
	Play : function() {
		var Manager = SHB.Manager;		
		var folderSB = Manager.folders[Manager.folderURI];
		
		switch (folderSB.state) {			
			case SHB.STATE_PAUSE :		
				folderSB.state = SHB.STATE_PLAY; // Replaying inbox
				SHB.Controllers.MajPlay(SHB.STATE_PLAY, folderSB.PlaybackMsgesCount() + 1);
				
				if (folderSB.listDates.length > 0) {
					SHB.Controllers.EnableSpeedDown();
					SHB.Controllers.EnableSpeedUp();
				}
					
				// If the SHB has messages to play (buffered messages)
				if (folderSB.cursor != folderSB.listDates.length-1) {
					document.getElementById("threadTree").setAttribute("style", "background-color:" + SHB.PLAY_MODE_COLOR);

					Manager.timer.initWithCallback(Manager.Handler_MailByMail, Manager.interval, SHB.Ci.nsITimer.TYPE_REPEATING_SLACK);
				}
				else {
					document.getElementById("Button-Play-Label").setAttribute("class", "Button-Label-hidden");
					document.getElementById("threadTree").setAttribute("style", Manager.bgcolorThread);
					SHB.Controllers.ClearSpeedButtons();
					folderSB.state = SHB.STATE_WAIT;
				}
			break;
			
			case SHB.STATE_PLAY :
			case SHB.STATE_WAIT :	
				folderSB.state = SHB.STATE_PAUSE; // Buffered messages	
				SHB.Controllers.EnableStop();
				Manager.Pause();
			break;
		}
	},

	// Divide reading speed
	SpeedDown : function() {
		SHB.Manager.timer.cancel();
		SHB.Manager.interval *= 2; // Less msges per second
		SHB.Controllers.EnableSpeedUp();
		
		if (SHB.Manager.interval < SHB.DEFAULT_DISPLAY_TIME) {
			// We just decrease the speed up label
			SHB.Controllers.UpdateSpeedUp(SHB.DEFAULT_DISPLAY_TIME / SHB.Manager.interval);
		}
		else {
			// Increase speed backward label
			SHB.Controllers.UpdateSpeedUp(0);
			
			if (SHB.Manager.interval == SHB.DEFAULT_DISPLAY_TIME) {
				// Default interval, no label displayed
				SHB.Controllers.UpdateSpeedDown(0);
			}
			else {
				SHB.Controllers.UpdateSpeedDown(SHB.Manager.interval / SHB.DEFAULT_DISPLAY_TIME);
			}
		}
			
		// Min speed
		if (SHB.Manager.interval == SHB.DEFAULT_DISPLAY_TIME * SHB.N_CHOICE_SPEED) {
			SHB.Controllers.DisableSpeedDown();
		}
			
		SHB.Manager.timer.initWithCallback(SHB.Manager.Handler_MailByMail, SHB.Manager.interval, SHB.Ci.nsITimer.TYPE_REPEATING_SLACK);
	},	
	
	// Display the next message
	NextMail :function (event) {
		// Check if the popup is not opened
		if (event==null || event.button == 0 && event.target == event.currentTarget && !event.currentTarget.open && !event.currentTarget.disabled) {	
			var Manager = SHB.Manager;
		
			Manager.timer.cancel();		
			Manager.interval = SHB.DEFAULT_DISPLAY_TIME;							
			
			var folderSB = Manager.folders[Manager.folderURI];
			
			if(folderSB.cursor < folderSB.listDates.length-1) {
				Manager.state=SHB.STATE_PAUSE;
				SHB.Controllers.MajPlay(SHB.STATE_PAUSE);
				SHB.Controllers.MajStop(SHB.STATE_PLAY);
				SHB.Controllers.ClearSpeedButtons();
				folderSB.cursor++;
				document.getElementById("threadTree").setAttribute("style", "background-color:" + SHB.BUFFER_MODE_COLOR);
				
				var msgesCount = folderSB.PlaybackMsgesCount();
				var date = folderSB.listDates[folderSB.cursor]+1;
				SHB.VirtualFolder.UpdateSearchTerms(date,SHB.BORNESUP,true);	
				SHB.VirtualFolder.SelectLastMessage(SHB.NEXT, folderSB.cursor);
				SHB.Controllers.UpdateCountPlay(msgesCount + 1);
				SHB.Controllers.EnablePrevMail();
				SHB.Controllers.UpdateCountPlay(msgesCount);
				
				// Tooltips
				var lastMsge = SHB.VirtualFolder.GetMessageAt(folderSB.cursor);
				SHB.Controllers.ButtonTooltip(SHB.SB_PREV_MAIL, folderSB.cursor + 1, lastMsge); 
				SHB.Controllers.ButtonTooltip(SHB.SB_PLAY, msgesCount, lastMsge);	
				
				// if we just played the last email left, stop (reset)
				if(folderSB.cursor == folderSB.listDates.length-1) {
					SHB.Controllers.DisableNextMail();
					SHB.Controllers.ButtonTooltip(SHB.SB_NEXT_MAIL, -1, null); 
				}	
				else {
					SHB.Controllers.ButtonTooltip(SHB.SB_NEXT_MAIL, msgesCount, SHB.VirtualFolder.GetMessageAt(folderSB.cursor + 1)); 
				}
			}  
		}
	},
						
	// Update the list of selected folders when the user clicks on other folders
	NewFolderSelection : function() {	
		var folderSB = SHB.Manager.folders[SHB.Manager.folderURI];
		
		// The Shift-Box is paused if it's replaying a folder
		if (folderSB && folderSB.state != SHB.STATE_WAIT) {
			if (folderSB.state == SHB.STATE_PLAY) {
				SHB.Manager.Pause();
			}
			/*
			for (var i = 0, c = gFolderTreeView._rowMap.length; i < c; i++) {				
				if (SHB.Manager.folderURI == gFolderTreeView._rowMap[i]._folder.URI) {
					var cols = gFolderTreeView._treeElement.columns;
					var name = gFolderTreeView._treeElement.view.getCellText(i, cols[0]);
					gFolderTreeView._treeElement.view.setCellText(i, cols[0], name + ' (' + folderSB.bufferedMsges + ')');
				
					break;
				}
			}*/
		}
		
		// New folder selection
		var selectedF = gFolderTreeView.getSelectedFolders();
		var reg = new RegExp("^.*://.*/"); // A folder which can contains messages (virtual or not)

		if (selectedF.length && reg.test(selectedF[0].URI)) {
			var uri = selectedF[0].URI;
			
			SHB.Manager.selectedFolder = selectedF[0];	
			SHB.Manager.folderURI = uri;
									
			SHB.Controllers.EnablePlay(); // necessary  ?
									
			if (!SHB.Manager.folders[uri]) {	
				// Never visited this folder before
				SHB.Manager.NewShbFolder(selectedF[0]); // New Shb virtual folder 
			}
			else {
				SHB.Manager.folders[uri].Update(); // Update messages
			}
							
			return true;
		}
		
		// Only bad selected folders (or none)
		document.getElementById("threadTree").setAttribute("style", this.bgcolorThread); // Displays default background color
		SHB.Controllers.DisableAll();
		SHB.Manager.timer.cancel();
		
		return false;
	},
	
	// Instanciate a new Folder variable representing a Thunderbird folder
	NewShbFolder : function(aFolder) {
		var sourceFolders;		// Source folder to get messages back
		
		if (aFolder.getFlag(SHB.Ci.nsMsgFolderFlags.Virtual)) { // Virtual folder
			sourceFolders = VirtualFolderHelper.wrapVirtualFolder(aFolder).dbFolderInfo.getCharProperty("searchFolderUri");
		}
		else { 
			sourceFolders = aFolder.URI;
		}
		
		this.folders[aFolder.URI] = new Folder(sourceFolders); 
	},
	
	// Update the list of items (menu popup)
	UpdatePopupItems : function(btn) {
		var list;
		var folderSB = SHB.Manager.folders[SHB.Manager.folderURI];
		var todayNb, sessionNb;
		
		if (btn == SHB.PREVIOUS) {			
			list = SHB.VirtualFolder.GetPreviousMsges(folderSB.cursor);
			todayNb = SHB.VirtualFolder.GetMsgesCountFromDate(SHB.Manager.today);
			sessionNb = SHB.VirtualFolder.GetMsgesCountFromDate(SHB.Manager.systemTime);
		}
		else {
			list = SHB.VirtualFolder.GetNextMsges(folderSB.cursor);
		}		
		
		SHB.Controllers.UpdatePopupMenu(btn, list, todayNb, sessionNb);
	},
	
	// Function called by a menuitem event (onclick)
	SelectMessage : function(btn, position) {
		var folderSB = SHB.Manager.folders[SHB.Manager.folderURI];
		
		if (btn == SHB.PREVIOUS) {
			folderSB.SetCursor(folderSB.listDates[position + 1]);
			SHB.Manager.PreviousMail();
		} 
		else { // NEXT
			if (position >= folderSB.listDates.length) { // Prevent page_down shortcut that may display 5 more messages
				if (folderSB.state != SHB.STATE_WAIT) {
					folderSB.cursor = folderSB.listDates.length - 2;
					SHB.Manager.NextMail();
				}
			}
			else {
				folderSB.SetCursor(folderSB.listDates[position - 1]);
				SHB.Manager.NextMail();
			}
		}
	},
	
	// Replay the selected folder from a specific email (called by its context menu)
	ReplayFromEmail : function() {		
		var Manager = SHB.Manager;	
		Manager.folders[Manager.folderURI].SetCursor(gFolderDisplay.selectedMessage.date + 1);
		Manager.PreviousMail();
	},
	
	// Mousewheel event (modify reading speed)
	MouseWheel : function(event) {
		if (event.detail < 0 && document.getElementById('SB_prevMail').getAttribute('disabled') == 'false') {	
			SHB.Manager.PreviousMail();
		}
		else if (event.detail > 0 && document.getElementById('SB_nextMail').getAttribute('disabled') != 'true') {
			SHB.Manager.NextMail();
		}
	},
	
	// Pause the selected conversation
	PauseThread : function() {
		
	},
	
	// Set the lower bound of the <n> last messages to be read (depending on date)
	LowerBound : function(n) { 
		var folderSB = SHB.Manager.folders[SHB.Manager.folderURI];
		var minDate;
		
		if (n == 0) { // Replay all today's messages
			minDate = new Date().setHours(0, 0, 0, 0) * 1000; // µs
		}
		else { // Replay messages of the current Thunderbird session
			minDate = this.systemTime;
		}
			
		document.getElementById('SB_all_emails').disabled = false;

		// Updating filters
		folderSB.Update(minDate);
		folderSB.SetCursor(minDate);
		SHB.VirtualFolder.UpdateSearchTerms(minDate, SHB.BORNEINF, true);
		SHB.VirtualFolder.UpdateSearchTerms(folderSB.listDates[folderSB.listDates.length - 1], SHB.BORNESUP, true);
		
		if (folderSB.listDates.length) {
			this.PreviousMail();
		}
		else {
			SHB.Controllers.DisableAll();
			SHB.Controllers.EnablePlay();
		}
	},
	
	// Filters
	FilterFolder : function(type) {
		if (type == 0) {
			this.startDate = 0;	
			document.getElementById('SB_all_emails').disabled = true;
			document.getElementById('SB_todays_emails').disabled = false;
			document.getElementById('SB_session_emails').disabled = false;
		}
		else if (type == 1) {	
			this.startDate = this.today; // µs
			document.getElementById('SB_todays_emails').disabled = true;
			document.getElementById('SB_all_emails').disabled = false;
			document.getElementById('SB_session_emails').disabled = false;
		}
		else if (type == 2) {
			this.startDate = this.systemTime;
			document.getElementById('SB_session_emails').disabled = true;
			document.getElementById('SB_todays_emails').disabled = false;
			document.getElementById('SB_all_emails').disabled = false;
		}
		
		var folderSB = this.folders[this.folderURI];
		folderSB.Update();
		
		this.Stop();
		
		SHB.VirtualFolder.UpdateSearchTerms(this.startDate, SHB.BORNEINF, false);
		SHB.VirtualFolder.UpdateSearchTerms(folderSB.listDates[folderSB.cursor], SHB.BORNESUP, true);
	},
	
	// Stop all folders (See popup menu of the Stop button)
	/*StopFolders : function() {
		for (var uri in this.folders) {
			var folderSB = this.folders[uri];
			if (folderSB.state != SHB.STATE_WAIT) { // Useless to stop this folder it is already stopped				
				folderSB.state = SHB.STATE_WAIT;
				
				if (folderSB.listDates.length) {
					folderSB.SetCursor(folderSB.listDates[folderSB.listDates.length - 1]);
				}
				else {
					folderSB.cursor = -1;
				}
			}
		}
		
		// If necessary, stop the current selected folder (if it is rereading its messages)
		this.Stop();
	}*/
};
 	
	
/*
------------------------------------------------------------
-------- Initialization of the Shift-Box (just once) -------
------------------------------------------------------------
*/
function Start() {		
	// Add a new mail listener
	var newMailListener = {
		msgAdded: function(aMsgHdr) {  	
			SHB.Manager.NewMailHandler(aMsgHdr); // SHB handler for a new mail
		}
	};
	
	var deletedMailListener = {
		msgsDeleted : function(msges) {
			this.msgsMoveCopyCompleted(true, msges);
		},
		
		/* aMove : 	true if a move, false if a copy
		 * msges : an array of the message headers in the source folder */
		msgsMoveCopyCompleted : function(aMove, msges) {
			/*var folderSB = SHB.Manager.folders[SHB.Manager.folderURI];
			alert(folderSB.listDates.length);
			folderSB.Update();				 // Update new list of messages without the deleted <msges>
			folderSB.cursor -= msges.length; // Update cursor because folderSB.listDates has just been reduced !
			alert(folderSB.listDates.length);
			SHB.Manager.InitGUI();	
			gFolderDisplay.show(MailUtils.getFolderForURI(SHB.Manager.folderURI));	*/
		},
	};
	
	var notificationService = SHB.Cc["@mozilla.org/messenger/msgnotificationservice;1"].getService(SHB.Ci.nsIMsgFolderNotificationService);
	notificationService.addListener(newMailListener, notificationService.msgAdded);	
	notificationService.addListener(deletedMailListener, notificationService.msgsDeleted | notificationService.msgsMoveCopyCompleted);	
	
	// Events
		/* Pop-menus events */
	document.getElementById('SB_prevMenu').addEventListener('popupshowing', function() { SHB.Manager.UpdatePopupItems(SHB.PREVIOUS); }, false);
	document.getElementById('SB_nextMenu').addEventListener('popupshowing', function() { SHB.Manager.UpdatePopupItems(SHB.NEXT); }, false);
	document.getElementById('mailContext').addEventListener('popupshowing', function() { 
																				var msge = gFolderDisplay.selectedMessage;
																				
																				// Display item only if one message is selected
																				document.getElementById('SB_replay_from').hidden = !msge;
																				
																				if (msge) {
																					var nMsgesToRead = SHB.VirtualFolder.GetMsgesCountFromDate(msge.date + 1);
																					SHB.Controllers.LabelContextMenu(nMsgesToRead);
																				}
																			}, false);
		
		/* User interface events */
	document.getElementById('SB_buttons').addEventListener('DOMMouseScroll', SHB.Manager.MouseWheel, false);
	var threadPane = document.getElementById(SHB.SB_FOLDERTREE);
	threadPane.addEventListener("mousedown", function() { document.getElementById('threadTree').firstChild.hidden = true; }, true); 
	threadPane.addEventListener("mouseup", function() { document.getElementById('threadTree').firstChild.hidden = false; if (SHB.Manager.NewFolderSelection()) { SHB.Manager.Reset(); } }, true); 
	threadPane.addEventListener("keypress", function(event) { 
												document.getElementById('threadTree').firstChild.hidden = false;
												if ((event.keyCode == 38 || event.keyCode == 40) && SHB.Manager.NewFolderSelection()) { // Arrow up/down
													SHB.Manager.Reset();
												}
											}, true); 
												
	var threadTree = document.getElementById(SHB.SB_THREADTREE);
	threadTree.addEventListener("mousedown", SHB.Manager.Pause, true);

	// Init SHB.Manager variables one time
	SHB.Manager.timer = SHB.Cc["@mozilla.org/timer;1"].createInstance(SHB.Ci.nsITimer);
	SHB.Manager.bgcolorThread = document.getElementById("threadTree").getAttribute("style"); 
	SHB.Manager.today = new Date().setHours(0, 0, 0, 0) * 1000;
	SHB.Manager.systemTime = new Date().getTime() * 1000;
	
	var folders = SHB.Manager.NewFolderSelection(); // Check old folder selection (last session)
		
	if (!folders) { 
		SHB.Controllers.DisablePlay();
	}
	else { // One or more selected folders
		var folderSB = SHB.Manager.folders[SHB.Manager.folderURI];
		folderSB.SetCursor(folderSB.listDates[folderSB.listDates.length - 1]);
		SHB.Manager.InitGUI();
		
		var buffering = SHB.Cc["@mozilla.org/preferences-service;1"].getService(SHB.Ci.nsIPrefService).getBranch("extensions.Shift-Box.").getBoolPref('buffLauching');

		if (buffering) {
			SHB.Manager.Play(); // Pause the Shift-Box depending on the user preference
		}
	}
			
	//document.addEventListener('DOMContentLoaded', function() { gFolderTreeView.selectFolder(MailUtils.getFolderForURI(SHB.Manager.folderURI)); }, false);
}

// Extending setPropertyAtoms to change folder background color when it is paused 
var AtomService = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
var propsFunction = setPropertyAtoms;
setPropertyAtoms = function (folder, props) {
	propsFunction(folder, props);
	var folderSHB = SHB.Manager.folders[folder.URI];
	if (folderSHB && folderSHB.state != SHB.STATE_WAIT) {
		props.AppendElement(AtomService.getAtom("pause")); // Css style for color						
	}
};

var launching = SHB.Cc["@mozilla.org/timer;1"].createInstance(SHB.Ci.nsITimer); // a revoir
launching.initWithCallback(Start, 100, SHB.Ci.nsITimer.TYPE_ONE_SHOT); // When tabmail is completely loaded in order to get back the folder selection (last session)

});


