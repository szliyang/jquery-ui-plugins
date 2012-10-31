if (!String.prototype.contains) {
    String.prototype.contains = function(prefix) {
        return this.indexOf(prefix) > -1;
    };
}

if (!String.prototype.containsAny) {
    String.prototype.containsAny = function(arrayOfStrings) {
        for (var x in arrayOfStrings) {
            if (this.indexOf(arrayOfStrings[x]) > -1) {
                return true;
            }
        }
        return false
    };
}

if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(prefix) {
        return this.indexOf(prefix) === 0;
    };
}

if (!String.prototype.endsWith) {
    String.prototype.endsWith = function(suffix) {    	
    	if (this.length < suffix.length) {
    		return false;
    	}
 
    	return this.lastIndexOf(suffix) === this.length - suffix.length;     	
    };
}

;(function($, undefined) {	
	
	var chars = new Array();
	chars[32]=' ';
	chars[48]='0';
	chars[49]='1';
	chars[50]='2';
	chars[51]='3';
	chars[52]='4';
	chars[53]='5';
	chars[54]='6';
	chars[55]='7';
	chars[56]='8';
	chars[57]='9';
	chars[65]='a';
	chars[66]='b';
	chars[67]='c';
	chars[68]='d';
	chars[69]='e';
	chars[70]='f';
	chars[71]='g';
	chars[72]='h';
	chars[73]='i';
	chars[74]='j';
	chars[75]='k';
	chars[76]='l';
	chars[77]='m';
	chars[78]='n';
	chars[79]='o';
	chars[80]='p';
	chars[81]='q';
	chars[82]='r';
	chars[83]='s';
	chars[84]='t';
	chars[85]='u';
	chars[86]='v';
	chars[87]='w';
	chars[88]='x';
	chars[89]='y';
	chars[90]='z';
	chars[96]='0';
	chars[97]='1';
	chars[98]='2';
	chars[99]='3';
	chars[100]='4';
	chars[101]='5';
	chars[102]='6';
	chars[103]='7';
	chars[104]='8';
	chars[105]='9';
	chars[106]='*';
	chars[107]='+';
	chars[109]='-';
	chars[110]=',';
	chars[111]='/';
	chars[186]=';';
	chars[187]='=';
	chars[188]=',';
	chars[189]='-';
	chars[190]='.';
	chars[191]='/';
	chars[192]='`';
	chars[219]='[';
	chars[220]='\\';
	chars[221]=']';
	chars[222]='\'';
	
	var shiftChars = new Array();
	shiftChars[32]=' ';
	shiftChars[48]=')';
	shiftChars[49]='!';
	shiftChars[50]='@';
	shiftChars[51]='#';
	shiftChars[52]='$';
	shiftChars[53]='%';
	shiftChars[54]='^';
	shiftChars[55]='&';
	shiftChars[56]='*';
	shiftChars[57]='(';
	shiftChars[65]='A';
	shiftChars[66]='B';
	shiftChars[67]='C';
	shiftChars[68]='D';
	shiftChars[69]='E';
	shiftChars[70]='F';
	shiftChars[71]='G';
	shiftChars[72]='H';
	shiftChars[73]='I';
	shiftChars[74]='J';
	shiftChars[75]='K';
	shiftChars[76]='L';
	shiftChars[77]='M';
	shiftChars[78]='N';
	shiftChars[79]='O';
	shiftChars[80]='P';
	shiftChars[81]='Q';
	shiftChars[82]='R';
	shiftChars[83]='S';
	shiftChars[84]='T';
	shiftChars[85]='U';
	shiftChars[86]='V';
	shiftChars[87]='W';
	shiftChars[88]='X';
	shiftChars[89]='Y';
	shiftChars[90]='Z';
	shiftChars[96]='0';
	shiftChars[97]='1';
	shiftChars[98]='2';
	shiftChars[99]='3';
	shiftChars[100]='4';
	shiftChars[101]='5';
	shiftChars[102]='6';
	shiftChars[103]='7';
	shiftChars[104]='8';
	shiftChars[105]='9';
	shiftChars[106]='*';
	shiftChars[107]='+';
	shiftChars[109]='-';
	shiftChars[110]=',';
	shiftChars[111]='/';
	shiftChars[186]=':';
	shiftChars[187]='+';
	shiftChars[188]='<';
	shiftChars[189]='_';
	shiftChars[190]='>';
	shiftChars[191]='?';
	shiftChars[192]='~';
	shiftChars[219]='{';
	shiftChars[220]='|';
	shiftChars[221]='}';
	shiftChars[222]='"';
	
	$.extend($.ui.keyCode, {
		A: 65,
		NUM_LOCK: 144,					
		NUMPAD_ZERO: 96,		
		PAUSE_BREAK: 19,		
		SCROLL_LOCK: 145,
		WINDOWS_RIGHT: 92,
		// This function returns the correct character for the keyboard scan code returned by keyup and keydown events.
		// This is only necessary because for some keys like the num lock key pad numbers, the keyboard scan code that
		// is returned by keyup and keydown events is not the correct ascii code and will therefore not return the correct
		// character when passed to String.fromCharCode(), i.e. if you press '7' on the number pad the keydown event returns
		// 103 which is actually an ascii 'g' so String.fromCharCode(event.keyCode) would return 'g' instead of '7'.
		keyCode2Char: function(keyCode, shift) {
			var myChar = shift ? shiftChars[keyCode] : chars[keyCode];
			myChar = (typeof myChar == 'undefined') ? '' : myChar;
			return myChar;
		}
	});
	
})(jQuery);