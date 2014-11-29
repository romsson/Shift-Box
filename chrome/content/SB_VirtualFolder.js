"use strict";

// Handle a virtual folder : creation, user selection, update messages, ...
SHB.ns(function() {

SHB.Cu.import("resource:///modules/virtualFolderWrapper.js"); 
SHB.Cu.import("resource:///modules/MailUtils.js"); 
SHB.Cu.import("resource:///modules/dbViewWrapper.js"); 

SHB.VirtualFolder = 
{
	searchTermSup:null,
	searchTermInf:null,
	// Customized filters used to filter according to time with a best accuracy. They are linked to searchTerms
	customSearchTermSup:null,
	customSearchTermInf:null,
	
	searchSession: SHB.Cc["@mozilla.org/messenger/searchSession;1"].createInstance(SHB.Ci.nsIMsgSearchSession),
	filterService: SHB.Cc["@mozilla.org/messenger/services/filters;1"].getService(SHB.Ci.nsIMsgFilterService),
	
	listMsges: [], // List of messages (calcuted one time for one Shift-box reading)
	sources:null,

	/*
	* Create a virtual folder and initialize its folders.
	* <folderSources> : contains a string like "URL1|URL2|URL3...". URL is a path to a folder
	*/
	Initialisation: function (folderSources)  { 
		this.sources = folderSources;
		var creation = this.CreateVirtualFolder();	
		SHB.Cc["@mozilla.org/messenger/account-manager;1"].getService(SHB.Ci.nsIMsgAccountManager).saveVirtualFolders();
	},
	
	/*
	* Add a list of searchTerms 
	* <virtualFolder> : SHB virtual folder
	* <aSearchTerms> : list of search terms
	*/
	AddSearchTerm: function(virtualFolder,aSearchTerms) {
		let condition = "";
		for (let term in fixIterator(aSearchTerms, SHB.Ci.nsIMsgSearchTerm)) {
		  if (condition.length)
			condition += " ";
		  if (term.matchAll) {
			condition = "ALL";
			break;
		  }
		  condition += (term.booleanAnd) ? "AND (" : "OR (";
		  condition += term.termAsString + ")";
		}
		virtualFolder.searchString = condition;	
	},
	
	/*
	* Create a search term to modify filters from customSearchTerm (using its identifiant) 
	* <customSearchTerm> : a customized search term
	*/	
	CreateSearchTermInf: function(customSearchTerm) {
		var searchTerm = this.searchSession.createTerm();	
		var value=searchTerm.value; // The only way to handle <value> (nsIMsgSearchValue) is get back it from searchTerm.value because we can't instantiate it
		value.attrib=SHB.Ci.nsMsgSearchAttrib.Custom; // We'll use a customized filter
		value.str="0";
		searchTerm.attrib=SHB.Ci.nsMsgSearchAttrib.Custom;
		searchTerm.value=value; // Update <value> from searchTerm 
		searchTerm.booleanAnd = true; // There is an AND Condition
		searchTerm.op=SHB.Ci.nsMsgSearchOp.IsAfter;
		searchTerm.customId=customSearchTerm.id;
		return searchTerm;
	},
	
	/*
	* Create a search term to modify filters from customSearchTerm (using its identifiant) 
	* <customSearchTerm> : a customized search term
	*/
	CreateSearchTermSup: function(customSearchTerm) {
		var searchTerm = this.searchSession.createTerm();
		var value=searchTerm.value;
		value.attrib=SHB.Ci.nsMsgSearchAttrib.Custom;
		value.str="0";
		searchTerm.attrib=SHB.Ci.nsMsgSearchAttrib.Custom;
		searchTerm.value=value;
		searchTerm.booleanAnd = true;
		searchTerm.op=SHB.Ci.nsMsgSearchOp.IsBefore;
		searchTerm.customId=customSearchTerm.id;
		return searchTerm;
	},
	
	/*
	* Create a virtual folder with existing source folders. Returns false if the creation of this folder fails
	* <sourceFolders> : list of folders
	*/
	CreateVirtualFolder :function () {
		var retour=true;
		var parentFolder=MailUtils.getFolderForURI(SHB.PARENT_FOLDER);
		
		// Search filters in order to create a virtual folder
		this.customSearchTermSup = this.CustomSearchSup();
		this.customSearchTermInf = this.CustomSearchInf();	
		
		// Add two filters to <filterService>
		this.filterService.addCustomTerm(this.customSearchTermSup);
		this.filterService.addCustomTerm(this.customSearchTermInf);
		
		// Instead of creating searchTerms several times, we create once and modify when necessary
		this.searchTermSup=this.CreateSearchTermSup(this.customSearchTermSup);
		this.searchTermInf=this.CreateSearchTermInf(this.customSearchTermInf);
		
		var listSearchTerms=new Array();
		listSearchTerms[0]=this.searchTermInf;
		listSearchTerms[1]=this.searchTermSup;
		try 
		{	
			var shbFolder = VirtualFolderHelper.createNewVirtualFolder(SHB.SHIFTBOX,parentFolder,this.sources,listSearchTerms);
			shbFolder.dbFolderInfo.sortType = SHB.Ci.nsMsgViewSortType.byDate;
			shbFolder.dbFolderInfos.sortOrder = SHB.Ci.nsMsgViewSortOrder.ascending;
		} 
		catch(err) // When the folder exists
		{
			var shbFolder = VirtualFolderHelper.wrapVirtualFolder(parentFolder.getChildNamed(SHB.SHIFTBOX));	
			shbFolder.searchTerms = listSearchTerms;
			shbFolder.dbFolderInfo.setCharProperty("searchFolderUri",this.sources);
			
			retour=false;
		}
						
		return retour;
	},
	
	CustomSearchInf: function () {
		var customTerm =
 		{
  			 id: "LimitInf@SHIFTBox",
  			 name: "limite Inferieure",
   			 getEnabled: function(scope, op)
			 {
				scope=Components.interfaces.nsMsgSearchScope.offlineMail;
				op=Components.interfaces.nsMsgSearchOp.IsAfter;
				return (scope && op);
			 },
  			getAvailable: function(scope, op)
    		{
				scope=Components.interfaces.nsMsgSearchScope.offlineMail;
				op=Components.interfaces.nsMsgSearchOp.IsAfter;
				return (scope && op);
			},
			getAvailableOperators: function(scope, length)
			{
				length.value = 1;
				return [Components.interfaces.nsMsgSearchOp.IsAfter];
			},
			match: function(msgHdr, searchValue, searchOp)
			{
				switch (searchOp)
				{
					case Components.interfaces.nsMsgSearchOp.IsAfter:
					/*msgHdr.getProperty("date")*/
						if ( msgHdr.date>= searchValue) {
							return true;
						}
				}
				return false;
			}
		};
		
		return customTerm;
	},
	
	CustomSearchSup: function () {
		var customTerm =
 		{
  			 id: "LimitSup@SHIFTBox",
  			 name: "Limite Superieure",
   			 getEnabled: function(scope, op)
			 {
				 scope=Components.interfaces.nsMsgSearchScope.offlineMail ;
				 op=Components.interfaces.nsMsgSearchOp.IsBefore;
				 return (scope && op);
			 },
  			getAvailable: function(scope, op)
    		{
				return scope == Components.interfaces.nsMsgSearchScope.offlineMail && op == Components.interfaces.nsMsgSearchOp.IsBefore
			},
			getAvailableOperators: function(scope, length)
			{
				length.value = 1;
				return [Components.interfaces.nsMsgSearchOp.IsBefore];
			},
			match: function(msgHdr, searchValue, searchOp)
			{
				switch (searchOp)
				{
					case Components.interfaces.nsMsgSearchOp.IsBefore:
						/*msgHdr.getProperty("date")*/
						if (msgHdr.date<=(searchValue)) {
						return true;
						}
					break;	
				}
				return false;
			}
		};
		
		return customTerm;
	},
	
	/*
	* Returns an array that contains dates of all messages belonging to selected folders
	*/
	GetListDateMsg: function (start, end) {
		this.UpdateListMsges(start, end);
		var listDates = []; // Only dates
		
		for (var i = 0, c = this.listMsges.length; i < c; i++) {
			listDates.push(this.listMsges[i].date);
		}
		
		return listDates;
	},
	
	/*
	* Update the array that contains all messages from selected folders
	*/
	UpdateListMsges : function(start, end) {
		this.listMsges = []; // Clear
		
		var folders = this.GetListFolders();
		if (folders != null) {
			for(var i = 0, c = folders.length; i < c; i++) {
				var listMsgesFolder = this.GetListMsgesFolder(folders[i], start, end);
				
				for(var j = 0, c = listMsgesFolder.length; j < c; j++) {
					this.listMsges.push(listMsgesFolder[j]);
				}
			}
			
			this.listMsges.sort(function(a, b) { return a.date - b.date; }); // Sort by date
		}
	},
	
	/*
	* Returns an array that contains all messages from one folder
	*/
	GetListMsgesFolder : function(aFolder, start, end) {
		var msgesAFolder = [];
		
		try {
			var msges = MailUtils.getFolderForURI(aFolder).messages;
			
			// Loop that get back messages
			if (start == null) {
				while (msges.hasMoreElements()) { 
					msgesAFolder.push(msges.getNext().QueryInterface(SHB.Ci.nsIMsgDBHdr));		
				}
			}
			else {
				while (msges.hasMoreElements()) { 
					var msge = msges.getNext().QueryInterface(SHB.Ci.nsIMsgDBHdr);
					
					if (msge.date >= start) {
						msgesAFolder.push(msge);		
					}
				}
			}
		} 
		catch (err) {}
		
		return msgesAFolder;
	},
		
	/*
	* Update filters (searchTerms) and refresh the list of messages if necesseray
	* <nouvDate> : new date
	* <typeBorne> : upper/lower bound
	* <refresh> : boolean 
	*/
	UpdateSearchTerms: function (nouvDate,typeBorne,refresh) {
		var parentFolder=MailUtils.getFolderForURI(SHB.PARENT_FOLDER);
		/*nous recuperons le repertoire parent du repertoire de SHB*/
		var shbFolder=VirtualFolderHelper.wrapVirtualFolder(parentFolder.getChildNamed(SHB.SHIFTBOX));
		/*nous recuperons le repertoire de SHB dans shbFolder*/
		// (parentFolder.getChildNamed("SHIFT Box")).updateFolder(msgWindow);
		var searchTermSup=this.searchTermSup;
		var searchTermInf=this.searchTermInf;
		
		if(typeBorne==SHB.BORNEINF) 
		{
			var value=searchTermInf.value;
			value.str=nouvDate;
			searchTermInf.value=value;
			this.searchTermInf=searchTermInf;
		}
		else 
		{
			var value=searchTermSup.value;
			value.str=nouvDate;
			searchTermSup.value=value;
			this.searchTermSup=searchTermSup;
		}
		
		var listSearchTerms = [];
		listSearchTerms[0] = searchTermInf;
		listSearchTerms[1] = searchTermSup;
		this.AddSearchTerm(shbFolder,listSearchTerms);	
		if(refresh)
		{
			var cols = document.querySelectorAll("#threadTree treecol");
			var colsProperties = [];
			
			for (var i = 0, c = cols.length; i < c; i++) {
				colsProperties[i] = {};
				colsProperties[i].isHidden = cols[i].hidden;
				colsProperties[i].position = cols[i].ordinal;
			}
			
			gFolderDisplay.show(parentFolder.getChildNamed(SHB.SHIFTBOX));
			
			for (var i = 0, c = cols.length; i < c; i++) {
				//var column = document.getElementById(cols[i].id);
				cols[i].hidden = colsProperties[i].isHidden;
				cols[i].ordinal = colsProperties[i].position;
			}
		}	
	},
	
	/*
	* Returns an array containing folders URIs 
	*/
	GetListFolders : function ()	{
		var reg = new RegExp("[|]","g");
		
		return (this.sources.split(reg));
	},
		
	/*
	* Select the last message (most recent) displayed in the Shift-Box (function used for "Previous/Next mail" buttons) if necessary
	* <direction> : Previous/next mail
	* <cursor> : current cursor of the shift box
	*/
	SelectLastMessage : function(direction, index) {	
		if (this.listMsges.length) {			
			if (direction == SHB.PREVIOUS) {
				// Select the most recent message only if the selected one "disappeared" from the Shift-box
				var selectedMsge = gFolderDisplay.selectedMessage;

				// Check user selection
				if (selectedMsge != null && this.listMsges[index].date <= selectedMsge.date) {					
					gFolderDisplay.selectMessage(this.listMsges[index]);
				}
			}
			else {				
				gFolderDisplay.selectMessage(this.listMsges[index]);
			}
		}
	},  
		
	/*
	* Returns the message at the <index> position or null if there is not
	* <index> : position 
	*/
	GetMessageAt : function(index) {
		if (index < 0 || index > this.listMsges.length) {
			return null;
		}
		else {
			return this.listMsges[index];
		}
	},	
	
	/*
	* Returns the previous messages (SHB.N_PREV_MAILS) until <index> 
	* <index> : position (must be <= this.listMsges.length)
	*/
	GetPreviousMsges : function(index) {
		var listPrev = [];
		
		// A message is a pair (position, subject) : position in the INBOX folder (will be used to come back to it easily)
		for (var i = index - SHB.N_PREV_MAILS; i < index; i++) {
			if (i >= 0) {
				listPrev.push({position : i, subject : this.listMsges[i].mime2DecodedSubject}); // msge <-> (position, subject)
			}
		}
		
		return listPrev;
	},
	
	/*
	* Returns the next messages (SHB.N_PREV_MAILS) from <index> 
	* <index> : position (must be >= -1)
	*/
	GetNextMsges : function(index) {
		var listNxt = [];
		var size = this.listMsges.length;
		
		// A message is a pair (position, subject) : position in the INBOX folder (will be used to come back to it easily)
		for (var i = index + 1; i < index + SHB.N_PREV_MAILS; i++) {
			if (i < size) {
				listNxt.push({position : i, subject : this.listMsges[i].mime2DecodedSubject}); // msge <-> (position, subject)
			}
		}
		
		return listNxt;
	},
	
	GetMsgesCountFromDate : function(aDate) {
		// We can do that because listMsges is sorted by date
		for (var i = 0, c = this.listMsges.length; i < c && this.listMsges[i].date < aDate; i++) 
		{}
		
		return (this.listMsges.length - i);
	}
};

});