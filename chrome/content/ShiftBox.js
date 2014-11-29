// Configuration
var SHB = 
{
	Cc: Components.classes,
    Ci: Components.interfaces,
	Cu: Components.utils,
	
	// SHIFT Box states
	STATE_WAIT:0,		// Present day, waiting for messages
	STATE_PAUSE:1,		// Pause (buffer)
	STATE_PLAY:2,		// Re-play INBOX

	// Various SHIFT Box ids
	SB_STOP:"SB_stop",
	SB_PREV_MAIL:"SB_prevMail",
	SB_SPEED_BACKWARD:"SB_speedbackward",
	SB_PLAY:"SB_play",
	SB_SPEED:"SB_speed",
	SB_NEXT_MAIL:"SB_nextMail",
	SB_OLDEST_MAIL:"SB_OldestMail",
	SB_NEWEST_MAIL:"SB_NewestMail",
	SB_SPLITTER:"SB_splitter",
	TABMAIL_CONTAINER:"tabmail-container",
	SB_PANEL:"SB_panel",
	SB_BOX:"SB_box",
	SB_LABEL_TIME:"SB_labelTime",
	SB_TREE:"SB_tree",
	SB_SUBJECT:"SB_subject",
	SB_SENDER:"SB_sender",
	SB_DATE:"SB_date",
	SB_TREE_CHILDREN:"SB_treeChildren",
	SB_DISPLAY:"SB_display",
	SB_MENULIST:"SB_menuList",
	SB_MENUPOPUP:"SB_menupopup",
	MAIL_REPLIED:'"57":true',
	MAIL_READ:'"56":true',
	URL_IMG_MAIL_REPLIED:"chrome://Shift-Box/content/icones/mailReply.png",
	SB_FIRSTCALENDAR:"SB_firstCalender",
	SB_FIRSTTIMEPICKER:"SB_firstTimePicker",
	SB_SECONDCALENDAR:"SB_secondCalender",
	SB_TWDEFAULT:"SB_TWdefault",
	SB_TWTIMELINE:"SB_TWTimeLine",

	// Existinq Thunderbird XUL objects ids
	SB_FOLDERTREE:"folderTree",
	SB_THREADTREE:"threadTree",

	NEXT : 0,
	PREVIOUS : 1,

	// Virtual Folder
	BORNEINF:0,
	BORNESUP:1,

	PARENT_FOLDER:"mailbox://nobody@Local%20Folders",
	SHIFTBOX:"SHIFT Box",
	
	BUFFER_MODE_COLOR: '#e6e6fa',
	PLAY_MODE_COLOR: '#eeeefb',
	
	N_PREV_MAILS: 10, // Number of previous messages to display into the popup menu
	N_NEXT_MAILS: 10, // Number of next messages to display into the popup menu
	
	TIMEOUT_POPUP: 500, // Time (in milliseconds) before showing a popup
	
	// Speed
	DEFAULT_DISPLAY_TIME: 1000, // Default duration between 2 messages updates (in milliseconds)
	N_CHOICE_SPEED: 8, // Must be a power of 2 (x2, x4, x8, x16, ...)
	
	// Bubble notifications
	NO_NOTIFY: 0,		// None notifications
	BIN_NOTIFY: 1,		// Binary notifications : only an empty bubble
	COUNT_NOTIFY: 2	// Count notifications : bubble and items count 
};

// http://blog.mozilla.com/addons/2009/01/16/firefox-extensions-global-namespace-pollution/
(function() {

var namespaces = [];

// Namespace registration
this.ns = function(fn) {
    var ns = {};
    namespaces.push(fn, ns);
    return ns;
};

// Namespace initialization
this.initialize = function() {
    for (var i=0; i<namespaces.length; i+=2) {
        var fn = namespaces[i];
        var ns = namespaces[i+1];
        fn.apply(ns);
    }
};

// Clean up
this.shutdown = function() {
    window.removeEventListener("load", SHB.initialize, false);
    window.removeEventListener("unload", SHB.shutdown, false);
	
	SHB.Manager.Stop();
	
	try {
		var folder = MailUtils.getFolderForURI(SHB.PARENT_FOLDER).getChildNamed(SHB.SHIFTBOX);
		var array = toXPCOMArray([folder], SHB.Ci.nsIMutableArray);
		folder.parent.deleteSubFolders(array, msgWindow);
	} catch (err) {
	}
};

// Register handlers to maintain extension life cycle.
window.addEventListener("load", SHB.initialize, false);
window.addEventListener("unload", SHB.shutdown, false);

}).apply(SHB);
