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
 *	date.js // required for date sorting
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
	$.widget('uiplugins.grid', {
		options: {
			rowKey: 'id',
			data: [],
			columns: [], // sorting defaults to true so that we get text & number sorting for free, if you specify a sort function we use that for compare, if you don't want sorting you have to opt out with sort: false				
			enableCellNavigation: true,
			enableColumnReorder: false,
			showHeaderRow: false,
			dataType: null,
			calendarImage: '../css/images/calendar.png',
			changedCellCssClass: ''
			// should think about just having an options property on column that identifies valid values, this could be an array of strings or objects that are used to
			// create both filters and editors. In addition, it could really be used to do automatic formatting in the case of an object array with name/value, i.e. if there
			// are a list of option object assigned to the column, I know we probably have to translate the "value" to the correct "name" to display 
		},
		filterValues: {
			'numericDialog': [
				{'name': 'Equal To', 'value': 'eq'},
				{'name': 'Not Equal To', 'value': 'neq'},
				{'name': 'Greater Than', 'value': 'gt'}, 
				{'name': 'Greater Than OR Equal To', 'value': 'gte'}, 
				{'name': 'Less Than', 'value': 'lt'}, 
				{'name': 'Less Than OR Equal To', 'value': 'lte'}
			],
			'dateDialog': [
				{'name': 'On', 'value': 'eq'},
				{'name': 'Before', 'value': 'lt'},
				{'name': 'After', 'value': 'gt'}
			],
			'date': [
			    {'name': 'Today', 'value': 'today'},
			    {'name': 'Tomorrow', 'value': 'tomorrow'},					
				{'name': 'Yesterday', 'value': 'yesterday'},					
				{'name': 'This Week', 'value': 'thisweek'},
				{'name': 'Next Week', 'value': 'nextweek'},
				{'name': 'Last Week', 'value': 'lastweek'},
				{'name': 'This Month', 'value': 'thismonth'},
				{'name': 'Next Month', 'value': 'nextmonth'},					
				{'name': 'Last Month', 'value': 'lastmonth'},
				{'name': 'This Year', 'value': 'thisyear'},
				{'name': 'Next Year', 'value': 'nextyear'},					
				{'name': 'Last Year', 'value': 'lastyear'}
			]
		},
		logicOperators: [
		    {'name': 'And', 'value': 'and'},
			{'name': 'Or', 'value': 'or'}
		],
		operators: {
		    'gt': function(a, b) {return +a > +b;}, // the plus is a fast way to convert the string to a number
		    'gte': function(a, b) {return +a >= +b;},
		    'lt': function(a, b) {return +a < +b;},
		    'lte': function(a, b) {return +a <= +b;},
		    'eq': function(a, b) {return +a == +b;},
		    'neq': function(a, b) {return +a != +b;},
		    'and': function(a, b) {return a && b;},
		    'or': function(a, b) {return a || b;}
		},
		formatDefaults: {
		    'checkbox': {'checkedValue': 'true', 'notCheckedValue': 'false'},				
			'currency': {'region': 'USD', 'thousands': ',', 'decimal': '.', 'decimals': 2},
		},
		cssStyleHash: {},
		_create: function() {
			var self = this,
				opts = this.options,
				dataView = this.dataView = new Slick.Data.DataView();
			this.dateInfo = this._initDateInfo();			
			this.element.addClass('ui-grid');
			this._initColumns();
			opts.showHeaderRow = this.filters ? true : false;
			var grid = this.grid = new Slick.Grid(this.element, this.dataView, opts.columns, opts);
			
			if(this.filters) {
				this._renderFilters();				
				this._bindFilterEvents();
			}
			
			this._initEventHandlers();
			
			grid.onSort.subscribe(function(e, args) {
	            sortCol = args.sortCol;
	            self.dataView.sort(self.sortFunctions[sortCol.id], args.sortAsc);	            
	            // fast sort seems to be much better in IE & FF but actually slower in Chrome so probably do a browser check here
	            //self.dataView.fastSort(sortCol.id, args.sortAsc);	            
	            grid.invalidate();
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
			var columns = this.options.columns;
			
			for(var i = 0; i < columns.length; i++) {
				var col = columns[i];
				col.headerCssClass += ' ui-grid-header';
				this.columns[col.id] = col; // store columns in a hash so we can access them by id easily later
				
				this._initSorting(col);				
				this._initFiltering(col);				
				this._initEditing(col);				
				this._initFormatting(col);				
			}			
			
			if(this.filters) {								
				var self = this;			
				this.dataView.setFilter(function(item) {
					return self._filter(item);
				});
			}			
		},	
		_initSorting: function(col, sortFunctions) {
			if(col.sort !== false) {
				if(!this.sortFunctions) {
					this.sortFunctions = {};
				}
				col.sortable = true;
				col.headerCssClass += col.headerCssClass + ' ui-grid-sortable';
				
				if(typeof col.sort === 'function') {
					this.sortFunctions[col.id] = col.sort;
				} else if(col.sort === 'date' && col.dateFormat) {
					// parse the date, convert to standard format, store standard format on row as new column, sort on that column
					this._initDateSort(col);						
					this.sortFunctions[col.id] = this._dateSort;
				} else if(col.dataType === 'numeric') {
					this.sortFunctions[col.id] = this._numericSort;
				} else {
					this.sortFunctions[col.id] = this._sort;
				}
			}			
		},
		_initFiltering: function(col) {
			if(col.filter) {			
				if(!this.filters) {
					this.filters = {};
				}
				
				var isList = $.isArray(col.filter);
				var defaultVal = isList && !col.filterDefault ? '$NO_FILTER$' : col.filterDefault; 
				// if the filter is an object, it's a custom filter and we expect an impl attribute that's a function that will do the filtering
				// if the custom filter has an options attribute, we render a list and it's value is used in the custom filter otherwise we do a text field
				if(col.filter.impl) {
					this.filters[col.id] = $.extend(col.filter, {'type': 'custom', 'value': defaultVal});						
				} else {
					var type = isList ? 'list' : col.filter;
					var options = isList ? col.filter : null;
					this.filters[col.id] = {'type': type, 'value': defaultVal, 'options': options};
				}
			}
		},
		_initEditing: function(col) {
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
		},
		_initFormatting: function(col) {
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
						this.hasCheckboxes = true;
						break;
					case 'currency':
						col.formatter = this._currencyFormatter;
						break;
					case 'properCase':
						col.formatter = this._properCaseFormatter;
						break;
				}
			}
			
			if(this.options.changedCellCssClass) {
				var self = this;
				col.primaryFormatter = col.formatter;								
				col.formatter = function(rowNum, cellNum, value, columnDef, row) {
					return self._changedCellFormatter.call(this, rowNum, cellNum, value, columnDef, row, self);
				};
			}
		},
		_initDateInfo: function() {
			var today = Date.today().clearTime();
			
			return {
				'today': today.getTime(),
				'tomorrow': Date.today().addDays(1).getTime(),
				'yesterday': Date.today().addDays(-1).getTime(),
				'sunday': today.getDay() == 0 ? today.clone() : Date.today().moveToDayOfWeek(0, -1).getTime(),
				'lastSunday': today.getDay() == 0 ? Date.today().moveToDayOfWeek(0, -1).getTime() : Date.today().moveToDayOfWeek(0, -1).moveToDayOfWeek(0, -1).getTime(),
				'nextSunday': Date.today().moveToDayOfWeek(0).getTime(),
				'dayMillis': 60 * 60 * 24 * 1000,
				'weekMillis': 60 * 60 * 24 * 7 * 1000,
				'lastMonthStart': Date.today().moveToFirstDayOfMonth().addDays(-1).moveToFirstDayOfMonth().getTime(),
				'thisMonthStart': Date.today().moveToFirstDayOfMonth().getTime(),				
				'nextMonthStart': Date.today().moveToLastDayOfMonth().addDays(1).getTime(),
				'nextMonthEnd': Date.today().moveToLastDayOfMonth().addDays(1).moveToLastDayOfMonth().addDays(1).getTime(),				
				'lastYearStart': Date.today().set({day: 1, month: 0, year: today.getFullYear() - 1}).getTime(),
				'thisYearStart': Date.today().set({day: 1, month: 0}).getTime(),
				'nextYearStart': Date.today().set({day: 1, month: 0, year: today.getFullYear() + 1}).getTime(),
				'nextYearEnd': Date.today().set({day: 1, month: 0, year: today.getFullYear() + 2}).getTime()
			};								
		},
		_initDateSort:function (column) {	            
			var rows = this.option('data');
			
			for(var i = 0; i < rows.length; i++) {
				var row = rows[i];
				// we'll need to simulate some threading in this
				// init method so the page load doesn't take forever when the dataset is huge				
				// parse date and store it as separate column so we don't take the hit of parsing on every sort
				row[column.field + '-sort'] = Date.parseExact(row[column.field], column.dateFormat).getTime();
			}
		},
		_initEventHandlers: function() {	
			this._bindEventHandler('onActiveCellChanged', this.options.onActiveCellChanged);
			this._bindEventHandler('onActiveCellPositionChanged', this.options.onActiveCellPositionChanged);
			this._bindEventHandler('onAddNewRow', this.options.onAddNewRow);
			this._bindEventHandler('onBeforeCellEditorDestroy', this.options.onBeforeCellEditorDestroy);
			this._bindEventHandler('onBeforeDestroy', this.options.onBeforeDestroy);
			this._bindEventHandler('onBeforeEditCell', this.options.onBeforeEditCell);
			this._bindEventHandler('onCellChange', this.options.onCellChange);
			this._bindEventHandler('onCellCssStylesChanged', this.options.onCellCssStylesChanged);
			this._bindEventHandler('onClick', this.options.onClick);
			this._bindEventHandler('onColumnsReordered', this.options.onColumnsReordered);
			this._bindEventHandler('onColumnsResized', this.options.onColumnsResized);
			this._bindEventHandler('onContextMenu', this.options.onContextMenu);
			this._bindEventHandler('onDblClick', this.options.onDblClick);
			this._bindEventHandler('onDrag', this.options.onDrag);
			this._bindEventHandler('onDragEnd', this.options.onDragEnd);
			this._bindEventHandler('onDragInit', this.options.onDragInit);
			this._bindEventHandler('onDragStart', this.options.onDragStart);
			this._bindEventHandler('onHeaderClick', this.options.onHeaderClick);
			this._bindEventHandler('onHeaderContextMenu', this.options.onHeaderContextMenu);
			this._bindEventHandler('onKeyDown', this.options.onKeyDown);
			this._bindEventHandler('onMouseEnter', this.options.onMouseEnter);
			this._bindEventHandler('onMouseLeave', this.options.onMouseLeave);
			this._bindEventHandler('onScroll', this.options.onScroll);
			this._bindEventHandler('onSelectedRowsChanged', this.options.onSelectedRowsChanged);
			this._bindEventHandler('onSort', this.options.onSort);
			this._bindEventHandler('onValidationError', this.options.onValidationError);
			this._bindEventHandler('onViewportChanged', this.options.onViewportChanged);
			
			if(this.hasCheckboxes) {
				this._bindCheckboxHandler();
			}			
		},
		_bindCheckboxHandler: function() {
			var self = this;
			var grid = this.grid;
			
			this.element.on('click', 'input.ui-grid-checkbox', function(e) {
				var activeCell = grid.getActiveCell();
				var item = grid.getDataItem(activeCell.row);
				var col = grid.getColumns()[activeCell.cell];	
				var $checkbox = $(this);
				item[col.field] = $checkbox.is(':checked') ? col.formatOptions.checkedValue : col.formatOptions.notCheckedValue;
				
				if(self.options.changedCellCssClass) {
					var $wrapperDiv = $checkbox.parent('div');
					$wrapperDiv.toggleClass(self.options.changedCellCssClass);
										
					if($wrapperDiv.hasClass(self.options.changedCellCssClass)) {
						var change = {};
						var originalValue = item[col.field] === col.formatOptions.checkedValue ? col.formatOptions.notCheckedValue : col.formatOptions.checkedValue;
			    		change[col.field] = originalValue;
			    		$.extend(true, item, {'changedCells': change});
					} else {
						delete item.changedCells[col.field];
					}
				}				
				
				self._slickGridTrigger(grid.onCellChange, {
					row: activeCell.row,
					cell: activeCell.cell,
					item: item
				 });
			});
		},
		_slickGridTrigger: function(evt, args, e) {	
			e = e || new Slick.EventData();
			args = args || {};
			args.grid = self;
			return evt.notify(args, e, self);
		},
		_bindEventHandler: function(eventName, handler) {
			if(handler) {
				this.grid[eventName].subscribe(handler);
			}
		},
		_sort: function(row1, row2) {
			// sortCol is set in the onSort.subscribe callback
			var val = row1[sortCol.field], val2 = row2[sortCol.field];
			return (val == val2 ? 0 : (val > val2 ? 1 : -1));
		},
		_numericSort: function(row1, row2) {
			var val = +row1[sortCol.field], val2 = +row2[sortCol.field];
			return (val == val2 ? 0 : (val > val2 ? 1 : -1));
		},
		_dateSort: function(row1, row2) {
			// sortCol is set in the onSort.subscribe callback
			var val = row1[sortCol.field + '-sort'], val2 = row2[sortCol.field + '-sort'];
			return (val == val2 ? 0 : (val > val2 ? 1 : -1));
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
                		self._renderTextFilter(id, $header, column, value)
                    		.width($header.width() - 24)
                    		.css('float', 'left')
                    		.textinput({'filter': 'numeric'});                    	                    	
                    	self._renderFilterButton(filter.type, column, $header);                    	
                    } else if(filter.type === 'date') {
                    	self._renderDropDownFilter(id, $header, column, self.filterValues[filter.type])
                    		.width($header.width() - 20)
                    		.css('float', 'left'); 
                    	self._renderFilterButton(filter.type, column, $header);
                    } else {
                    	self._renderTextFilter(id, $header, column, value);
                    }                    		          
                }
			}
		},
		_renderFilterButton: function(type, column, $appendTo) {
			$('<span class="ui-filter-button"/>')
        		.appendTo($appendTo)
        		.data({'columnId': column.id, 'type': type});
		},
		_renderTextFilter: function(id, $header, column, value) {
			var self = this;
			return $('<input id="' + id + '" type="text" class="ui-grid-filter" value="' + value + '">')
        		.appendTo($header)
        		.data('columnId', column.id)
        		.width($header.width() - 4)
        		.height($header.height() - 12)
        		.click(function() {
                	self._saveCurrentEdit();
                	$(this).focus();
                });
		},
		_renderDropDownFilter: function(id, $header, column, options) {
			var self = this;
			var html = '<select id="' + id + '" class="ui-grid-filter">';
			html += '<option value="$NO_FILTER$"></option>';
			var filter = this.filters[column.id];
			var filterValue = filter.value;
			
			for(var i = 0; i < options.length; i++) {
				var option = options[i];
				var isObject = typeof option === 'object';
				var value = isObject ? option.value : option;
				var name = isObject ? option.name : option;				
				html += '<option value="' + value + '"' + (value === filterValue ? 'selected' : '') + '>' + name + '</option>';								
			}			
            html += '</select>';
            return $(html).appendTo($header)
            	.data('columnId', column.id)
            	.width($header.width() - 4)
                .val(filterValue)
                .click(function() {
                	self._saveCurrentEdit();
                	$(this).focus();
                });
		},
		_renderFilterDialog: function(columnId, type) {
			var $dialog = $('#ui-grid-filter-dialog-' + columnId);
			
			if($dialog.length == 0) {
				var html = '<div id="ui-grid-filter-dialog-' + columnId + '" style="display: none;" class="ui-grid-filter-dialog">';
				html += '<div><label>Show rows where </label><label class="columnName"></label></div>';
				
				html += this._getFilterHtml(type + 'Dialog');				
				html += '<div>';
				
				for(var i = 0; i < this.logicOperators.length; i++) {
					var operator = this.logicOperators[i];
					html += '<input type="radio" name="logicOperator" class="ui-filter-logic-operator" value="' + operator.value + '"/><label>' + operator.name + '</label>';
				}
				
				html += '</div>';				
				html += this._getFilterHtml(type + 'Dialog');
					
				html += '</div>';
				$dialog = $(html);
			}
			
			return $dialog;			
		},
		_getFilterHtml: function(type) {
			var html = '<div><select class="ui-filter-compare-operator">';
			var filters = this.filterValues[type];
			
			for(var i = 0; i < filters.length; i++) {
				var filter = filters[i];
				html += '<option value="' + filter.value + '">' + filter.name + '</option>';
			}

			html += '<input type="text" class="ui-filter-val' + (type.startsWith('date') ? ' ui-date-filter' : '') + '"/>';			
			html += '</select>';
			html += '</div>';
			
			return html;
		},
		_bindFilterEvents: function() {
			var self = this;
			// bind events that will cause filters to run when filter value changes
			$headerRow = $(this.grid.getHeaderRow());
			$headerRow.on('change keyup', 'input, select', function(e) {
				var columnId = $(this).data('columnId');					
				self._filterColumn(columnId);
			});
			
			// numeric filters show a dialog where the user enters compare values, those filters run when they hit the ok button on the dialog
			$headerRow.on('click', 'span.ui-filter-button', function(e) {
				var $this = $(this);
				var columnId = $this.data('columnId');
				var filterType = $this.data('type'); 
				self._showFilterDialog($(this), columnId, filterType);
			});
		},
		_showFilterDialog: function($filterButton, columnId, type) {
			var self = this;
			var $dialog = this._renderFilterDialog(columnId, type);
			var column = this.columns[columnId];
			var buttons = {				
				'Cancel': function() {
					$(this).dialog('close');
				},
				'OK': function() {					
					self._applyDialogFilter($dialog, column);
				}
			};
			
			if(this.filters[columnId].logic) {
				buttons['Clear'] = function() {
					self._clearDialogFilter($dialog, columnId);
				};
			}
			$dialog.find('label.columnName').text(column.name + ' is:');
			$dialog.find('input.ui-date-filter').datepicker({
				showOn: 'button',
				buttonImageOnly: true,
				buttonImage: self.options.calendarImage,
				beforeShow: function() {
					$('#ui-datepicker-div').addClass('ui-grid-datepicker');			       
				},
				onClose: function() {
					$('#ui-datepicker-div').addClass('ui-grid-datepicker');
				}
			});
			
			$dialog.keypress(function(event) {
				if (event.keyCode == $.ui.keyCode.ENTER) {
					self._applyDialogFilter($dialog, column);
				}
			});
			
			$dialog.dialog({
				'title': (type.toProperCase() + ' Filter'), 
				'modal': true,
				'dialogClass': "ui-filter-dialog",
				'buttons': buttons,
				'position': {my: 'left top', at: 'left bottom', of: $filterButton}
    			}).show();
		},		
		_filterColumn: function(columnId) {
			// shouldn't need this null check but there's some inconsistent behavior with the event handling that requires it
			if (columnId) {				
				var filter = this.filters[columnId];
				
				if(filter.type === 'numeric' || filter.type === 'date') {
					var $dialog = $('#ui-grid-filter-dialog-' + columnId);
					var column = this.columns[columnId];
					var filterLogic = {};
					filterLogic.comparisons = [];
					$dialog.find('select.ui-filter-compare-operator').each(function() {
						var $select = $(this);
						var compareValue = $select.next('input.ui-filter-val').val();
						
						if(compareValue) {
							compareValue = filter.type === 'date' ? Date.parseExact(compareValue, column.dateFormat).getTime() : compareValue;
							filterLogic.comparisons.push({'operator': $select.val(), 'value': compareValue});
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
	            		              
	            	if((filter && filter.value !== undefined && filter.value !== '$NO_FILTER$') || (filter.logic)) {
	                    var columns = grid.getColumns();
	                    var column = columns[grid.getColumnIndex(columnId)];
	                    
	                    if (column == null || column == undefined) {
	                    	//column is in the filter list, but is not visible, no need to filter
	                    	continue;
	                    }
	                    
	                    var itemVal = item[column.field] + '';
	                    
	                    if(itemVal || itemVal === '') {
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
		                    		result = this._applyNumericFilter(filter, itemVal);                   				                    				                    			                    
		                    		break;
		                    	case 'date':
		                    		result = this._applyDateFilter(filter, item[column.field + '-sort']);
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
		_applyNumericFilter: function(filter, itemVal) {
			var result = true;
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
			
			return result;
		},
		_applyDateFilter: function(filter, itemVal) {
			var result = true;
			itemVal = +itemVal;
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
				switch(filter.value) {
					case 'today':						
						result = itemVal >= this.dateInfo.today && itemVal < this.dateInfo.tomorrow;
						break;
					case 'tomorrow':
						result = itemVal >= this.dateInfo.tomorrow && itemVal < this.dateInfo.tomorrow + this.dateInfo.dayMillis;
						break;
					case 'yesterday':
						result = itemVal >= this.dateInfo.yesterday && itemVal < this.dateInfo.today;
						break;
					case 'thisweek':
						result = itemVal >= this.dateInfo.sunday && itemVal < this.dateInfo.nextSunday;
						break;
					case 'nextweek':
						result = itemVal >= this.dateInfo.nextSunday && itemVal < this.dateInfo.nextSunday + this.dateInfo.weekMillis;
						break;
					case 'lastweek':
						result = itemVal >= this.dateInfo.lastSunday && itemVal < this.dateInfo.sunday;
						break;
					case 'thismonth':
						result = itemVal >= this.dateInfo.thisMonthStart && itemVal < this.dateInfo.nextMonthStart;
						break;
					case 'nextmonth':						
						result = itemVal >= this.dateInfo.nextMonthStart && itemVal < this.dateInfo.nextMonthEnd;
						break;
					case 'lastmonth':
						result = itemVal >= this.dateInfo.lastMonthStart && itemVal < this.dateInfo.thisMonthStart;
						break;
					case 'thisyear':
						result = itemVal >= this.dateInfo.thisYearStart && itemVal < this.dateInfo.nextYearStart;
						break;
					case 'nextyear':
						result = itemVal >= this.dateInfo.nextYearStart && itemVal < this.dateInfo.nextYearEnd;
						break;
					case 'lastyear':
						result = itemVal >= this.dateInfo.lastYearStart && itemVal < this.dateInfo.thisYearStart;
						break;
				}    			
    		}
			
			return result;
		},
		_applyDialogFilter: function($dialog, column) {
			var self = this;
			var columnId = column.id;
			this._filterColumn(columnId);					
			this.grid.updateColumnHeader(columnId, column.name + '<span id="' + columnId + '_removeFilterButton" class="ui-remove-filter-button"></span>', '');
			$('#' + columnId + '_removeFilterButton').click(function() {
				self._clearDialogFilter($dialog, columnId);						
			});
			$dialog.dialog('close');
		},
		_clearDialogFilter: function($dialog, columnId) {
			this.filters[columnId].logic = null;
			$dialog.find('select.ui-filter-compare-operator').val('');
			$dialog.find('input.ui-filter-val').val('');					
			$dialog.find('input.ui-filter-logic-operator').removeAttr('checked');					
			this._filterColumn(columnId);			
			$('#' + columnId + '_removeFilterButton').remove();
			$dialog.dialog('close');
		},
		_dateEdit: function(args) {			
			var $input = null;
			var defaultValue = null;		
			var calendarImage = args.grid.getOptions()['calendarImage'];
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
					showOn: 'button',
					buttonImageOnly: true,
					buttonImage: calendarImage,
					beforeShow: function () {
						$('#ui-datepicker-div').addClass('ui-grid-datepicker');	
						calendarOpen = true;
					},
					onClose: function () {
						$('#ui-datepicker-div').addClass('ui-grid-datepicker');
						calendarOpen = false;
					}
				});
				
				$input.width($input.width() - 18);
			};
			
			this.destroy = function () {
				$.datepicker.dpDiv.stop(true, true);
				$input.datepicker('hide');
				$input.datepicker('destroy');
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
				$.datepicker.dpDiv.css('top', position.top + 30).css('left', position.left);
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
					item[col.field + '-sort'] = Date.parseExact(state, col.dateFormat).getTime();
				}				
			};
			
			this.isValueChanged = function () {				
				var isChanged = (!($input.val() == '' && defaultValue == null)) && ($input.val() != defaultValue);
				
				// track the original value of changed items
		    	if(isChanged && (!args.item.changedCells || !args.item.changedCells[args.column.field])) {
		    		var change = {};
		    		change[args.column.field] = defaultValue;
		    		$.extend(true, args.item, {'changedCells': change});
		    	}
		    	
				return isChanged;
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
			var $input = null;
			var defaultValue = null;
		
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
					.css({'position': 'relative', 'top': -$paddingTop, 'left': -$cell.padding('left'), 'text-align': $cell.css('text-align')})
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
		    	var isChanged = (!($input.val() == '' && defaultValue == null)) && ($input.val() != defaultValue);
		    			    	
		    	// track the original value of changed items
		    	if(isChanged && (!args.item.changedCells || !args.item.changedCells[args.column.field])) {
		    		var change = {};
		    		change[args.column.field] = defaultValue;
		    		$.extend(true, args.item, {'changedCells': change});
		    	}
				
		    	return isChanged; 
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
			var $select = null;
			var defaultValue = null;

			this.init = function () {
				var html = '<select tabIndex="0" class="ui-grid-editor">';
				var options = args.column.editorOptions;
				var $cell = $(args.container);
		    	var paddingTop = $cell.padding('top');
		    	var paddingLeft = $cell.padding('left');
		    	
				for(var i = 0; i < options.length; i++) {
					var option = options[i];
					var isObject = typeof option === 'object';
					var name = isObject ? option.name : option;
					var value = isObject ? option.value : option;
					
					html += '<option value="' + value + '">' + name + '</option>';
				}
				
				html += '</select>';
				$select = $(html)
					.width($cell.width() + $cell.padding('right') + paddingLeft)
					.height($cell.height() + paddingTop + $cell.padding('bottom'))
					.css({'position': 'relative', 'top': -paddingTop, 'left': -paddingLeft, 'text-align': $cell.css('text-align')})
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
				var isChanged = $select.val() != defaultValue;
				
				// track the original value of changed items
		    	if(isChanged && (!args.item.changedCells || !args.item.changedCells[args.column.field])) {
		    		var change = {};
		    		change[args.column.field] = defaultValue;
		    		$.extend(true, args.item, {'changedCells': change});
		    	}
				return isChanged;
			};

			this.validate = function () {
				return {
					valid: true,
					msg: null
				};
			};

			this.init();
		},		
		_saveCurrentEdit: function() {
			var gridEditorLock = this.grid.getEditorLock();
			
			if(gridEditorLock.isActive()) {
				gridEditorLock.commitCurrentEdit();
			}
		},
		_currencyFormatter: function(rowNum, cellNum, value, columnDef, row) {			

			if($.currency) {
				value = $.currency(value, columnDef.formatOptions);
			}			
						
			return value;
		},
		_checkboxFormatter: function(rowNum, cellNum, value, columnDef, row) {
			var html = '<div><input type="checkbox" class="ui-grid-checkbox"';			
			
			if(value && (value + '').toLowerCase() !== columnDef.formatOptions.notCheckedValue.toLowerCase()) {
				html += ' checked="checked"';
			}
			
			html += '/></div>';
			return html;
		},
		_properCaseFormatter: function(rowNum, cellNum, value, columnDef, row) {
			return value ? value.toProperCase() : '';			
		},
		_changedCellFormatter: function(rowNum, cellNum, value, columnDef, row, self) {
			
			if(columnDef.primaryFormatter) {
				value = columnDef.primaryFormatter.call(this, rowNum, cellNum, value, columnDef, row);
			}
						
			if(row.changedCells && row.changedCells[columnDef.field]) {
				value = '<div class="' + self.options.changedCellCssClass + ' ui-changed-cell">' + value + '</div>';
			}
			
			return value;
		},
		getGrid: function() {
			return this.grid;
		},
		setCellCssClass: function(rowIndex, columnIndex, cssClass) {
	        var row = this.cssStyleHash[rowIndex] ? this.cssStyleHash[rowIndex] : {};
	        row[this.grid.getColumns()[columnIndex].field] = cssClass;
	        this.cssStyleHash[rowIndex] = row;	        
	        this.grid.removeCellCssStyles('cssStyleHash');
	        this.grid.setCellCssStyles('cssStyleHash', this.cssStyleHash);	  
		},
		getSelectedItems: function() {
			return this.grid.getSelectionModel().getSelectedItemIds();
		},
		setSelectedItems: function() {
			
		},
		disable: function() {
			$.Widget.prototype.disable.call(this);			
			this._trigger('disable');
		},
		enable: function() {
			$.Widget.prototype.enable.call(this);			
			this._trigger('enable');
		},		
		destroy: function() {
			this.grid.onColumnsReordered.unsubscribe();
			this.grid.onColumnsResized.unsubscribe();
			$.Widget.prototype.destroy.call(this);		
		}
	});
})(jQuery);