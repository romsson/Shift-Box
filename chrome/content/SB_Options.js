// Configuration of SHB
var SHB_Options = {};

(function() {
	// SB buttons
	var buttons = null;
	var blueBubble = null;	// Play bubble
	var redBubble = null;	// Stop bubble
	var greenBubbleUp = null;	// Speed bubble
	var greenBubbleDw = null;	// Speed bubble
	var sizesStr = ['large', 'medium', 'small'];
	var notify; // Bubble notifications
	
	// User preferences
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.Shift-Box.");
	var win = null;
	var doc = null;
	
	// Initialization : Default options
	this.Init = function () {
		document.getElementById("SB_ButtonSize").value = prefs.getIntPref("buttonsSize"); // Preference size
		document.getElementById('SB_buff').checked = prefs.getBoolPref('buffLauching'); 
		document.getElementById('SB_notifications').value = prefs.getIntPref('notifications'); 
		
		win = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("mail:3pane");	
		doc = win.document;
		buttons = doc.getElementById('SB_buttons').getElementsByTagName('toolbarbutton');
		blueBubble = doc.getElementById('Button-Play-Label');
		redBubble = doc.getElementById('Button-Stop-Label');
		greenBubbleUp = doc.getElementById('Button-Speedup-Label');
		greenBubbleDw = doc.getElementById('Button-Speeddown-Label');
	};
			
	// Function called when user changes buttons size to display temporarily the result (does not save !)
	this.ButtonsSize = function(size) {		
		if (size == -1) {
			doc.getElementById('SB_buttons').hidden = true;
		}
		else {
			doc.getElementById('SB_buttons').hidden = false;
			SHB_Options.UpdateButtonsSize(buttons, size);
			SHB_Options.UpdateBubbleSize(blueBubble, size);
			SHB_Options.UpdateBubbleSize(redBubble, size);
			SHB_Options.UpdateBubbleSize(greenBubbleUp, size);
			SHB_Options.UpdateBubbleSize(greenBubbleDw, size);
		}
	};
	
	// Save options (button pressed)
	this.SaveOptions = function() { 
		prefs.setIntPref("buttonsSize", document.getElementById("SB_ButtonSize").value);
		prefs.setBoolPref('buffLauching', document.getElementById('SB_buff').checked);
		prefs.setIntPref('notifications', notify);
	};
	
	// Cancel modifications (cancel button clicked) 
	this.Cancel = function() {
		SHB_Options.ButtonsSize(prefs.getIntPref("buttonsSize")); 
		win.SHB.Controllers.BubbleNotifications(prefs.getIntPref('notifications')); 
		win.SHB.Manager.InitGUI();
	};
	
	// Change SB buttons size (used by SHB_Options and SHB.Controllers (for default buttons preferences))
	this.UpdateButtonsSize = function(buttons, size) {		
		for (var i = 0, c = buttons.length; i < c; i++) {
			buttons[i].setAttribute('iconesize', sizesStr[size]);
		}
	};
	
	// Update bubble size
	this.UpdateBubbleSize = function(bubble, size) {
		bubble.setAttribute('iconesize', sizesStr[size]);
	};
	
	this.Notifications = function(type) {
		notify = type;
		win.SHB.Controllers.BubbleNotifications(type);
		win.SHB.Manager.InitGUI();
	};

}).apply(SHB_Options);

