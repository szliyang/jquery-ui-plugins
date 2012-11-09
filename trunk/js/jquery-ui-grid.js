/*
 * jQuery UI Grid 0.0.9
 *
 * Copyright 2012, Chad LaVigne
 * Licensed under the MIT license (http://www.opensource.org/licenses/mit-license.php) 
 *
 * http://code.google.com/p/jquery-ui-plugins/wiki/Grid
 *
 * Depends:
 *  jquery 1.7 // currently broken with 1.8.2 and 1.9  
 *	jquery.ui.core.1.8.16.js
 *	jquery.ui.widget.1.8.16.js
 *	jquery.event.drag-2.0.js	
 *	slick.core.2.0.2.js
 *	slick.grid.2.0.2.js
 *	slick.dataview.2.0.2.js
 *
 *Notes for column model:
 * ID == unique id for the column
 * FIELD == property on the data object used to get the value to display for the data
 * NAME == the column Header text
 * ID will often be the same as FIELD but it allows you to make 2 different columns display the same data differently (using a different formatter or whatever)
 * if you don't provide a value for FIELD the column won't display any data but if you omit ID it works, the id in this case is presumably the field?
 *	filter: null, // can be 'startsWith', 'endsWith', 'contains', 'doesNotContain', an array of values for a drop down list or an object with an impl property that is a function
		// to do custom filtering, the function receives filterValue and itemValue parameters and "this" refers to the filter object, it returns true if the value should be shown, false otherwise
		// if filter is an array or a custom filter object has an options array, a drop down list will be rendered
		// options for drop downs can either be a simple string array, in which case the value displayed for an option is the same as the option's value OR it can be an array of objects 
		// containing name & value attributes - the name is what will be displayed in the dropdown list, the value is the value that will be used for filtering when the option is selected
		filterDefault: null, // default value selected for filter		
		editor: null,
		// columns can have an editor which can be a string for pre-defined types or a function that gets an object param with the following attributes:
			/*
			 * cancelChanges: function cancelEditAndSetFocus() {
				column: Object
				commitChanges: function commitEditAndSetFocus() {
				container: HTMLDivElement
				grid: SlickGrid
				gridPosition: Object
				item: Object
				position: Object
				defaultValue: undefined

 */
;(function($, undefined) {
	$.widget("uiplugins.grid", {
		options: {
			rowKey: "id",
			data: [],
			columns: [], // sorting defaults to true so that we get text & number sorting for free, if you specify a sort function we use that for compare, if you don't want sorting you have to opt out with sort: false				
			enableCellNavigation: true,
			enableColumnReorder: false,
			showHeaderRow: false
			// should think about just having an options property on column that identifies valid values, this could be an array of strings or objects that are used to
			// create both filters and editors. In addition, it could really be used to do automatic formatting in the case of an object array with name/value, i.e. if there
			// are a list of option object assigned to the column, I know we probably have to translate the "value" to the correct "name" to display 
		},		
		_create: function() {
			var self = this,
				opts = this.options,
				dataView = this.dataView = new Slick.Data.DataView();
						
			this.numericFilters = [
				{'name': 'Equals', 'value': 'eq'},
				{'name': 'Greater Than', 'value': 'gt'}, 
				{'name': 'Greater Than OR Equal To', 'value': 'gte'}, 
				{'name': 'Less Than', 'value': 'lt'}, 
				{'name': 'Less Than OR Equal To', 'value': 'lte'}
			];
			this.logicOperators = [
			    {'name': 'And', 'value': 'and'},
				{'name': 'Or', 'value': 'or'}
			];
			this.operators = {
			    'gt': function(a, b) {return +a > +b;}, // the plus is a fast way to convert the string to a number
			    'gte': function(a, b) {return +a >= +b;},
			    'lt': function(a, b) {return +a < +b;},
			    'lte': function(a, b) {return +a <= +b;},
			    'eq': function(a, b) {return +a == +b;},
			    'and': function(a, b) {return a && b;},
			    'or': function(a, b) {return a || b;},
			};
			this.formatDefaults = {
			    'checkbox': {'notCheckedValue': 'false'},				
				'currency': {'region': 'USD', 'thousands': ',', 'decimal': '.', 'decimals': 2},
			};
			this.element.addClass('ui-grid');
			this._initColumns();
			opts.showHeaderRow = this.filters ? true : false;
			var grid = this.grid = new Slick.Grid(this.element, this.dataView, opts.columns, opts);
			
			if(this.filters) {
				this._renderFilters();
				
				// bind events that will cause filters to run when filter value changes
				$headerRow = $(this.grid.getHeaderRow());
				$headerRow.on('change keyup', 'input, select', function(e) {
					var columnId = $(this).data('columnId');					
					self._filterColumn(columnId);
				});
				
				// numeric filters show a dialog where the user enters compare values, those filters run when they hit the ok button on the dialog
				$headerRow.on('click', 'input.ui-filter-button', function(e) {
					var columnId = $(this).data('columnId');
					self._showNumericFilterDialog($(this), columnId);
				});
			}
			
			grid.onSort.subscribe(function(e, args) {
	            sortCol = args.sortCol;
	            var start = new Date().getTime();	            
	            self.dataView.sort(self.sortFunctions[sortCol.id], args.sortAsc);	            
	            grid.invalidate();
	            console.log(new Date().getTime() - start);
	        });			
						
			grid.onColumnsReordered.subscribe(function() {
				self._renderFilters();
			});
		
			grid.onColumnsResized.subscribe(function() {
				self._renderFilters();
			});
			
			dataView.beginUpdate();
			dataView.setItems(opts.data, opts.rowKey);
			dataView.endUpdate();
			grid.invalidate();
		},
		_initColumns: function() {
			this.columns = {};
			var sortFunctions = {};
			var filters = {};			
			var hasFilters = false;			
			var columns = this.options.columns;
			
			for(var i = 0; i < columns.length; i++) {
				var col = columns[i];
				this.columns[col.id] = col; // store columns in a hash so we can access them by id easily later
				
				if(col.sort !== false) {
					col.sortable = true;
					
					if(typeof col.sort === 'function') {
						sortFunctions[col.id] = col.sort;
					} else if(col.sort === 'date' && col.dateFormat) {
						// parse the date, convert to standard format, store standard format on row as new column, sort on that column
						this._initDateSort(col);
						sortFunctions[col.id] = this._dateSort;
					} else {
						sortFunctions[col.id] = this._compare;
					}
				}		
				
				if(col.filter) {
					hasFilters = true;					
					// if the filter is an object, it's a custom filter and we expect an impl attribute that's a function that will do the filtering
					// if the custom filter has an options attribute, we render a list and it's value is used in the custom filter otherwise we do a text field
					if(col.filter.impl) {
						filters[col.id] = $.extend(col.filter, {"type": "custom", "value": col.filterDefaultValue});						
					} else {
						var isList = $.isArray(col.filter);
						var type = isList ? 'list' : col.filter;
						var options = isList ? col.filter : null;
						filters[col.id] = {"type": type, "value": col.filterDefault, "options": options};
					}					
				}
				
				if(col.editor) {
					// if it's not a custom function apply the correct built-in editor
					if(typeof col.editor !== 'function') {
						var editor = col.editor;
						
						if($.isArray(editor)) {
							col.editor = this._dropDownEdit;
							col.editorOptions = editor;
						} else if(editor === 'date') {
							col.editor = this._dateEdit;
						} else {
							col.editor = this._textEdit;
							col.dataType = editor;
						}													
					}
				}
				
				// if it's not a custom format function, set up the correct built-in formatter
				if(col.formatter && typeof col.formatter !== 'function') {

					if(typeof col.formatter === 'string') {
						col.formatOptions = $.extend({'type': col.formatter}, this.formatDefaults[col.formatter]);
					} else if(typeof col.formatter === 'object' && col.formatter.type) {
						col.formatOptions = $.extend({}, this.formatDefaults[col.formatter.type], col.formatter);
					}
					
					switch(col.formatOptions.type) {
						case 'checkbox':							
							col.formatter = this._checkboxFormatter;
							break;
						case 'currency':
							col.formatter = this._currencyFormatter;
							break;
					}
				}
			}
			
			this.sortFunctions = sortFunctions;
			
			if(hasFilters) {				
				this.filters = filters;
				var self = this;			
				this.dataView.setFilter(function(item) {
					return self._filter(item);
				});
			}			
		},
		_compare: function(row1, row2) {
			// sortCol is set in the onSort.subscribe callback
			var val = row1[sortCol.field], val2 = row2[sortCol.field];			
			return (val == val2 ? 0 : (val > val2 ? 1 : -1));
		},
		_initDateSort:function (column) {
			var rows = this.option('data');
			for(var i = 0; i < rows.length; i++) {
				var row = rows[i];
				row[column.field + '-sort'] = Date.parseExact(row[column.field], column.dateFormat);
			}
		},
		_dateSort: function(row1, row2) {
			// sortCol is set in the onSort.subscribe callback			
			return row1[sortCol.field + '-sort'].compareTo(row2[sortCol.field + '-sort']);
		},
		_renderFilters: function() {
			var self = this;
			var grid = this.grid;
			var columns = grid.getColumns();
			
			for(var i = 0; i < columns.length; i++) {
				var column = columns[i];
				var filter = self.filters[column.id];
				
                if(filter) {
                    var $header = $(grid.getHeaderRowColumn(column.id)).empty();
                    var id = 'ui-grid-filter-' + column.id;
                    var value = filter.value ? filter.value : '';
                    
                    if(filter.options) {
                    	self._renderDropDownFilter(id, $header, column, filter.options);                    	
                    } else if(filter.type === 'numeric') {
                    	var $textFilter = self._renderTextFilter(id, $header, column, value);
                    	$('<input type="image" src="../css/images/filter.png" class="ui-filter-button"/>')
                    		.appendTo($header)
                    		.data("columnId", column.id);                    	
                    	$textFilter
                    		.width($header.width() - 24)
                    		.css('float', 'left')
                    		.textinput({'filter': 'numeric'});
                    } else {
                    	self._renderTextFilter(id, $header, column, value);
                    }                    		          
                }
			}
		},
		_renderTextFilter: function(id, $header, column, value) {
			return $('<input id="' + id + '" type="text" class="ui-grid-filter" value="' + value + '">')
        		.appendTo($header)
        		.data('columnId', column.id)
        		.width($header.width() - 4)
        		.height($header.height() - 12);
		},
		_renderDropDownFilter: function(id, $header, column, options) {
			var html = '<select id="' + id + '" class="ui-grid-filter">';
			html += '<option value=""></option>';
			var filter = this.filters[column.id];
			var filterValue = filter.value;
			
			for(var i = 0; i < options.length; i++) {
				var option = options[i];
				var value = option.value ? option.value : option;
				var name = option.name ? option.name : option;				
				html += '<option value="' + value + '"' + (value === filterValue ? 'selected' : '') + '>' + name + '</option>';								
			}			
            html += '</select>';
            $(html).appendTo($header)
            	.data('columnId', column.id)
            	.width($header.width() - 4)
                .val(filterValue);            
		},
		_renderNumericFilterDialog: function(columnId) {
			var $dialog = $('#ui-grid-filter-dialog-' + columnId);
			
			if($dialog.length == 0) {
				var html = '<div id="ui-grid-filter-dialog-' + columnId + '" style="display: none;" class="ui-grid-filter-dialog">';
				html += '<div><label>Show rows where </label><label class="columnName"></label></div>';
				
				html += this._getNumericFilterHtml();				
				html += '<div>';
				
				for(var i = 0; i < this.logicOperators.length; i++) {
					var operator = this.logicOperators[i];
					html += '<input type="radio" name="logicOperator" class="ui-filter-logic-operator" value="' + operator.value + '"/><label>' + operator.name + '</label>';
				}
				
				html += '</div>';				
				html += this._getNumericFilterHtml();
					
				html += '</div>';
				$dialog = $(html);
			}
			
			return $dialog;			
		},
		_getNumericFilterHtml: function() {
			var html = '<div><select class="ui-filter-compare-operator">';
			
			for(var i = 0; i < this.numericFilters.length; i++) {
				var filter = this.numericFilters[i];
				html += '<option value="' + filter.value + '">' + filter.name + '</option>';
			}
			
			html += '<input type="text" class="ui-filter-val"/>';
			html += '</select>';
			html += '</div>';
			
			return html;
		},
		_showNumericFilterDialog: function($filterButton, columnId) {
			var self = this;
			var $dialog = this._renderNumericFilterDialog(columnId);
			var column = this.columns[columnId];
			var buttons = {				
				'Cancel': function() {
					$(this).dialog('close');
				},
				'OK': function() { 
					self._filterColumn(columnId);
					$(this).dialog('close');
				},
			};
			
			if(this.filters[columnId].logic) {
				buttons['Clear'] = function() {
					self.filters[columnId].logic = null;
					$dialog.find('select.ui-filter-compare-operator').val('');
					$dialog.find('input.ui-filter-val').val('');					
					$dialog.find('input.ui-filter-logic-operator').removeAttr('checked');					
					self._filterColumn(columnId);
					$(this).dialog('close');
				};
			}
			$dialog.find('label.columnName').text(column.name + ' is:');
			$dialog.dialog({
				"title": "Numeric Filter", 
				"modal": true,
				"dialogClass": "ui-numeric-filter-dialog",
				"buttons": buttons,
				"width": "254px",
				"position": {my: "left top", at: "left bottom", of: $filterButton}
    			}).show();
		},
		_filterColumn: function(columnId) {
			// shouldn't need this null check but there's some inconsistent behavior with the event handling that requires it
			if (columnId) {
				var filter = this.filters[columnId];
				
				if(filter.type === 'numeric') {
					var $dialog = $('#ui-grid-filter-dialog-' + columnId);
					var filterLogic = {};
					filterLogic.comparisons = [];
					$dialog.find('select.ui-filter-compare-operator').each(function() {
						var $select = $(this);
						var compareValue = $select.next('input.ui-filter-val').val();
						if(compareValue) {
							filterLogic.comparisons.push({"operator": $select.val(), "value": compareValue});
						}						
					});
					filterLogic.logicOperator = $dialog.find('input.ui-filter-logic-operator:checked').val();
					
					if(filterLogic.comparisons.length) {
						filter.logic = filterLogic;
					} 					
				}
				
				filter.value = $.trim($('#ui-grid-filter-' + columnId).val());
				
				this.dataView.refresh();
				// invalidate will cause slick grid to call _filter because we registered _filter as the filter function for the grid
				this.grid.invalidate();
			}			
		},		
		_filter: function(item) {		
			var grid = this.grid;
            var filters = this.filters;
            
			if (item && filters) {
				var result = true;
            
	            for (var columnId in filters) {
	            	var filter = filters[columnId];
	            		              
	            	if((filter && filter.value) || (filter.logic)) {
	                    var columns = grid.getColumns();
	                    var column = columns[grid.getColumnIndex(columnId)];
	                    
	                    if (column == null || column == undefined){
	                    	//column is in the filter list, but is not visible, no need to filter
	                    	continue;
	                    }
	                    
	                    var itemVal = item[column.field] + '';
	                    
	                    if(itemVal) {
	                    	switch(filter.type) {
		                    	case 'startsWith':
		                    		result =  itemVal.toLowerCase().startsWith(filter.value);
		                    		break;
		                    	case 'endsWith':
		                    		result =  itemVal.toLowerCase().endsWith(filter.value);
		                    		break;
		                    	case 'contains':
		                    		result =  itemVal.toLowerCase().indexOf(filter.value) > -1;
		                    		break;
		                    	case 'doesNotContain':
		                    		result =  itemVal.toLowerCase().indexOf(filter.value) === -1;
		                    		break;
		                    	case 'list':
		                    		result = itemVal === filter.value;
		                    		break;		                    	
		                    	case 'numeric':		
		                    		var logic = filter.logic;
		                    		
	                    			if(logic && logic.comparisons.length > 0) {
		                    			var compare1 =  logic.comparisons[0];
		                    			var compare2 =  logic.comparisons[1];
			                    		var logicOperator = logic.logicOperator;
			                    		
			                    		if(compare2 && logicOperator) {
			                    			var result1 = this.operators[compare1.operator](itemVal, compare1.value);
			                    			var result2 = this.operators[compare2.operator](itemVal, compare2.value);		                    			
			                    			result = this.operators[logicOperator](result1, result2);			                    			
			                    		} else {
			                    			result = this.operators[compare1.operator](itemVal, compare1.value);
			                    		}
		                    		}
	                    			
	                    			if(filter.value) {
		                    			result = result && +itemVal == +filter.value;
		                    		}	                    				                    				                    			                    
		                    		break;
		                    	case 'custom':
		                    		result = filter.impl.call(filter, filter.value, itemVal);
		                    		break;
	                    	}	                    	                   
	                    }
	
	                    if (!result) {
	                        return result;
	                    }                
	                }
	            }
			}
            
            return true;        
		},
		_dateEdit: function(args) {
			var $input;
			var defaultValue;			   
			var calendarOpen = false;
			
			this.init = function () {
				var $cell = $(args.container);
		    	var $paddingTop = $cell.padding('top');
				$input = $('<input type="text" class="ui-grid-editor" />')
					.appendTo(args.container)
					.width($cell.width() + $cell.padding('right') - ($.browser.msie || $.browser.mozilla ? 2 : 1))
					.height($cell.height() - $paddingTop - $cell.padding('bottom'))
					.css({'position': 'relative', 'top': -$paddingTop, 'left': -$cell.padding('left')})
					.focus().select();
				
				$input.datepicker({
					showOn: "button",
					buttonImageOnly: true,
					buttonImage: "../css/images/calendar.png",
					beforeShow: function () {
						calendarOpen = true;
					},
					onClose: function () {
						calendarOpen = false;
					}
				});
				
				$input.width($input.width() - 18);
			};
			
			this.destroy = function () {
				$.datepicker.dpDiv.stop(true, true);
				$input.datepicker("hide");
				$input.datepicker("destroy");
				$input.remove();
			};
			
			this.show = function () {
				if (calendarOpen) {
					$.datepicker.dpDiv.stop(true, true).show();
				}
			};
			
			this.hide = function () {
				if (calendarOpen) {
					$.datepicker.dpDiv.stop(true, true).hide();
				}
			};
			
			this.position = function (position) {
				if (!calendarOpen) {
					return;
				}
				$.datepicker.dpDiv.css("top", position.top + 30).css("left", position.left);
			};
			
			this.focus = function () {
				$input.focus();
			};
			
			this.loadValue = function (item) {
				defaultValue = item[args.column.field];
					$input.val(defaultValue);
					$input[0].defaultValue = defaultValue;
					$input.select();
			};
			
			this.serializeValue = function () {
				return $input.val();
			};
			
			this.applyValue = function (item, state) {
				var col = args.column;
				item[col.field] = state;
				
				if(col.sort === 'date' && col.dateFormat) {
					item[col.field + '-sort'] = Date.parseExact(state, col.dateFormat);
				}				
			};
			
			this.isValueChanged = function () {
				return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
			};
			
			this.validate = function () {
				return {
					valid: true,
					msg: null
				};
			};
			
			this.init();
		},
		_textEdit: function(args) {			
			var $input;
			var defaultValue;
		
		    this.init = function () {
		    	var $cell = $(args.container);
		    	var $paddingTop = $cell.padding('top');
		    	$input = $('<input type="text" class="ui-grid-editor"/>')
					.appendTo(args.container)
					.bind('keydown.nav', function (e) {
						if (e.keyCode === $.ui.keyCode.LEFT || e.keyCode === $.ui.keyCode.RIGHT) {
							e.stopImmediatePropagation();
						}
					})
					.width($cell.width() + $cell.padding('right') - ($.browser.msie || $.browser.mozilla ? 2 : 1))
					.height($cell.height() - $paddingTop - $cell.padding('bottom'))
					.css({'position': 'relative', 'top': -$paddingTop, 'left': -$cell.padding('left')})
					.focus()
					.select();
		    	
		    	switch(args.column.dataType) {
		    		case 'integer':
		    			$input.textinput({'filter': 'digits'});
		    			break;
		    		case 'numeric':
		    			$input.textinput({'filter': 'numeric'});
		    			break;		    		
		    	}
		    };
		
		    this.destroy = function () {				
		    	$input.remove();
		    };
		
		    this.focus = function () {
		    	$input.focus();
		    };
		
		    this.getValue = function () {
		    	return $input.val();
		    };
		
		    this.setValue = function (val) {
		    	$input.val(val);
		    };
		
		    this.loadValue = function (item) {
				defaultValue = item[args.column.field] || '';
				$input.val(defaultValue);
				$input[0].defaultValue = defaultValue;
				$input.select();
		    };		    
		
		    this.serializeValue = function () {
		    	return $input.val();
		    };
		
		    this.applyValue = function (item, state) {
		    	item[args.column.field] = state;
		    };
		
		    this.isValueChanged = function () {
		    	return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
		    };
		
		    this.validate = function () {
		    	if (args.column.validator) {
		    		var validationResults = args.column.validator($input.val());
		    		if (!validationResults.valid) {
		    			return validationResults;
		    		}
		    	}
		
		    	return {
		    		valid: true,
		    		msg: null
		    	};
		    };
		
		    this.init();
		},
		_dropDownEdit: function(args) {
			var $select;
			var defaultValue;

			this.init = function () {
				var html = '<select tabIndex="0" class="ui-grid-editor">';
				var options = args.column.editorOptions;
				var $cell = $(args.container);
		    	var paddingTop = $cell.padding('top');
		    	var paddingLeft = $cell.padding('left');
		    	
				for(var i = 0; i < options.length; i++) {
					var option = options[i];
					var name = option.name ? option.name : option;
					var value = option.value ? option.value : option;
					
					html += '<option value="' + value + '">' + name + '</option>';
				}
				
				html += '</select>';
				$select = $(html)
					.width($cell.width() + $cell.padding('right') + paddingLeft)
					.height($cell.height() + paddingTop + $cell.padding('bottom'))
					.css({'position': 'relative', 'top': -paddingTop, 'left': -paddingLeft})
					.appendTo(args.container)
					.focus();
			};

			this.destroy = function () {
				$select.remove();
			};

			this.focus = function () {
				$select.focus();
			};

			this.loadValue = function (item) {
				$select.val((defaultValue = item[args.column.field] + ''));
				$select.select();
			};

			this.serializeValue = function () {
				return $select.val();
			};

			this.applyValue = function (item, state) {
				item[args.column.field] = state;
			};

			this.isValueChanged = function () {
				return ($select.val() != defaultValue);
			};

			this.validate = function () {
				return {
					valid: true,
					msg: null
				};
			};

			this.init();
		},
		_currencyFormatter: function(rowNum, cellNum, value, columnDef, row) {			

			if($.currency) {
				value = $.currency(value, columnDef.formatOptions);
			}			
						
			return value;
		},
		_checkboxFormatter: function(rowNum, cellNum, value, columnDef, row) {
			var html = '<input type="checkbox"';			
			
			if(value && (value + '').toLowerCase() !== columnDef.formatOptions.notCheckedValue.toLowerCase()) {
				html += ' checked="checked"';
			}
			
			html += '/>';
			return html;
		},		
		getSelectedItems: function() {
			return this.grid.getSelectionModel().getSelectedItemIds();
		},
		setSelectedItems: function() {
			
		},
		disable: function() {
			$.Widget.prototype.disable.call(this);			
			this._trigger("disable");
		},
		enable: function() {
			$.Widget.prototype.enable.call(this);			
			this._trigger("enable");
		},		
		destroy: function() {
			this.grid.onColumnsReordered.unsubscribe();
			this.grid.onColumnsResized.unsubscribe();
			$.Widget.prototype.destroy.call(this);		
		}
	});
})(jQuery);