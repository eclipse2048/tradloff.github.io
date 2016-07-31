/*
 * Bla bla bla what is this, GPL, author, bla.
 */


/* ****************************
 *
 * some helper functions
 *
 * ****************************
 */

/** Displays a dismissable message on top of the page using bootstrap's
 * "alert" class.
 * @param {string} msg - The message text.
 * @param {string} level - The message's urgency level. Valid levels are info (default), success, warning, and danger.
 *
 */
function _raiseMessage(msg, level) {
	// reset level parameter to info if invalid
	if ( level == null || "info success warning danger".indexOf(level.toLowerCase()) == -1 ) {
		level = "info";
	};
	return $("#msg").html('\
        <div class="alert alert-' + level.toLowerCase() + ' fade in">\
	      <a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>\n\
	      ' + msg + '\n\
        </div>');

	//TODO: auto-remove message after ~5 seconds
};


/** Returns a string with all HTML characters_unescaped into regular
 * characters, e.g. "&gt;" is changed into ">".
 * @param {string} str - A string.
 * @returns {string} - The unescaped string
 *
 */
function _unescape(str) { return $("<div/>").html(str).text(); };


// collects all projects and contexts from all todo description and stores them via jQuery.data() within the tbody#sortable element
function _collectProjectsAndContexts() {
	var procons = [];

	// collect all projects and contexts from todo descriptions
	$("td.todo-desc").each(function() {
		desc = _unescape($(this).html()).split(" ");
		for (var i = 0; i < desc.length; i++) {
			if ( desc[i].length < 2 ) { continue; }
			switch ( desc[i].slice(0,1) ) {
				case "@":
				case "+":
					if ( procons.indexOf(desc[i]) == -1 ) procons.push(desc[i]);
					break;
			}
		}
	});

	// store projects and contexts with the tbody element
	$("tbody#sortable").data("procons", procons.sort());
}

// returns a promise for the main modal, enabling asynchronous functionality
function _getTodoModalPromise() {
	var deferred = new $.Deferred();

	// handler for modal submission
	function _handleTodoModalSubmit() {
		// if there are forms, do they all validate?
		if ( $("#todoModal form:visible").length == 0 || $("#todoModal form:visible")[0].checkValidity() ) {
			deferred.resolve();
		} else {
			// otherwise do some javascript magic to trigger a form submit which will show validation messages while not actually going through
			$('<input type="submit">').hide().appendTo("#todoModal form:visible").click().remove();
		}
	}

	// remove existing modal handlers so events will be triggered no more than once
	$("button#todoModalCancel, button#todoModalOK").off("click");
	$("#todoModal").off("hidden.bs.modal");

	// add new OK/Cancel handlers that resolve/reject the deferred object
	$("button#todoModalOK").on("click", _handleTodoModalSubmit);
	$("button#todoModalCancel").on("click", deferred.reject);
	$("#todoModal").on("hidden.bs.modal", deferred.reject);

	return deferred.promise();
}


/* calculate urgency level
 *
 * @param {boolean} closed
 * @param {string} duedate
 *
 * urgency levels are:
 * 0: todo is closed
 * 1: todo has no due date
 * 2: due date is >7 days away
 * 3: due date is 4-7 days away
 * 4: due date is 1-3 days away
 * 5: due date is today or in the past
 */
function _getUrgencyLevel(closed, duedate) {
	if ( closed ) { return 0; }
	if ( duedate == null || duedate.trim() == "" ) { return 1; }
	var now = Date.now(),
		dueDate = new Date(duedate),
		daysUntilDue = (dueDate - (now - (now % 86400000))) / 86400000;
	if ( daysUntilDue <= 0 ) {
		return 5;
	} else switch ( daysUntilDue ) {
		case 1:
		case 2:
		case 3:
			return 4;
		case 4:
		case 5:
		case 6:
		case 7:
			return 3;
		default:
			return 2;
	};
	return false;
}


// helper function that fixes wrong table cell width while dragging
// source: http://www.foliotek.com/devblog/make-table-rows-sortable-using-jquery-ui-sortable/
function _sortableHelperFix(e, ui) {
	ui.children().each(function() {
		$(this).width($(this).width());
	});
	return ui;
}


// splits a string into the word under the cursor position, the part before the word, and the part after the word
function _splitInputTerm(terms, cursorPos) {
console.log("cursorpos is " + cursorPos + " and terms.length is " + terms.length);
	if ( cursorPos < 0 ) cursorPos = 0;
	else if ( cursorPos >= terms.length ) {
		if ( terms.slice(-1) == " " ) return { before: terms, after: "", under: "" }
		else cursorPos = terms.length - 1;
	}
	var termsBefore = terms.slice(0, cursorPos).split(/\s+/),
		termsAfter = terms.slice(cursorPos).split(/\s+/);
	return {
		before: termsBefore.slice(0, -1).join(" "),
		after: termsAfter.slice(1).join(" "),
		under: termsBefore.pop() + termsAfter.splice(0, 1),
	};
}


// autocomplete handler function; is triggered when autocomplete menu is closed
function _autocompleteClose(e) {
	// only do stuff if menu was closed via escape key
	if ( e.keyCode === $.ui.keyCode.ESCAPE ) {

		// prevent modal from closing too
		$("#todoModal").one('hide.bs.modal', function() {
			return false;
		});

		// use stored cursor position to reset cursor in input field
		if ( $(e.target).data("cursorPos") ) {
			var pos = $(e.target).data("cursorPos");
			e.target.setSelectionRange(pos, pos);
			$(e.target).removeData("cursorPos");
		}
	}
}


// autocomplete handler function; is triggered when an autocomplete item is focused (not selected)
function _autocompleteFocus(event, ui) {
	var cursorPos = this.selectionStart,
		terms = _splitInputTerm(this.value, cursorPos);
		tBefore = terms.before ? terms.before + " " : "",
		tAfter = terms.after ? " " + terms.after : " "

	// exchange term under the cursor with focused item (corrected for spaces)
	this.value = tBefore + ui.item.value + tAfter;

	// start selection at cursor position, end it after the newly added focus item
	this.setSelectionRange(cursorPos, tBefore.length + ui.item.value.length);
	return false;
}


// autocomplete handler function; is triggered when an autocomplete item is selected
function _autocompleteSelect(event, ui) {
	var terms = _splitInputTerm(this.value, this.selectionStart),
		tBefore = terms.before ? terms.before + " " : "",
		tAfter = terms.after ? " " + terms.after : " "

	// exchange term under the cursor with focused item (corrected for spaces)
	this.value = tBefore + ui.item.value + tAfter;

	// set cursor position to after the space after the newly added item
	this.selectionEnd = this.selectionStart = tBefore.length + ui.item.value.length + 1;

	// if selection was made via ENTER key: stop propagation to prevent modal form submission
	if ( event.keyCode === $.ui.keyCode.ENTER ) { event.stopPropagation(); }

	return false;
}


// autocomplete callback function; is triggered at the beginning of a search
function _autocompleteSource(request, response) {
	var cursorPos = $("#todoModalDesc").get(0).selectionStart,
		terms = _splitInputTerm(request.term, cursorPos),
		sliceUntil = terms.before.length == 0 ? cursorPos : cursorPos - terms.before.length - 1;

	// don't search for a zero-length string
	if ( sliceUntil <= 0 || terms.under.length == 0 ) return false;

	// don't search if search term's first character is not + or @
	var c = terms.under.slice(0, 1);
	if ( c != "+" && c != "@" ) return false;

	// call response function with the result from the regular autocomplete filter function
	// source = projects/contexts
	// search string = from "+"/"@" up to the cursor's position
console.log("source: searching for " + terms.under.slice(0, sliceUntil));
	response($.ui.autocomplete.filter($("tbody#sortable").data("procons"), terms.under.slice(0, sliceUntil)));
}


/**
 * jQuery.fn.sortElements
 * --------------
 * @author James Padolsey (http://james.padolsey.com)
 * @version 0.11
 * @updated 18-MAR-2010
 * --------------
 * @param Function comparator:
 *   Exactly the same behaviour as [1,2,3].sort(comparator)
 *
 * @param Function getSortable
 *   A function that should return the element that is
 *   to be sorted. The comparator will run on the
 *   current collection, but you may want the actual
 *   resulting sort to occur on a parent or another
 *   associated element.
 *
 *   E.g. $('td').sortElements(comparator, function(){
 *      return this.parentNode;
 *   })
 *
 *   The <td>'s parent (<tr>) will be sorted instead
 *   of the <td> itself.
 *
 * Note from TR: I rewrote most of the original function
 * using modern jQuery. Find the original version here:
 * http://james.padolsey.com/javascript/sorting-elements-with-jquery/
 */
jQuery.fn.sortElements = (function() {
	var sort = [].sort;
	return function(comparator, getSortable) {
		getSortable = getSortable || function() { return $(this); };
		var placements = $(this).map(function(){
			var sortElement = getSortable.call($(this)),
				flagNode = $(document.createTextNode(""));
			sortElement.after(flagNode);
			return function() {
				if ( sortElement.parent() === $(this) ) {
					throw new Error( "You can't sort elements if any one is a descendant of another." );
				}
				// Insert before flag:
				flagNode.before($(this));
				// Remove flag:
				flagNode.remove();
			};
		});
		return sort.call($(this), comparator).each(function(i){
			placements[i].call(getSortable.call($(this)));
		});
	};
})();


/* ***********************************************
 *
 * Todo object constructor and method functions
 *
 * ***********************************************
 */

/**
 * Represents a Todo object. The function accepts one parameter, which
 * can be of different types. The function will try to parse the
 * parameter in the best way possible to populate the Todo.
 *
 * @class
 *
 * @param {string} opts - A string in the todo.txt format will result
 * in the according Todo object.
 * @param {jQuery} opts - A jQuery object containing a "tr.todo"
 * tablerow will result in the according Todo object.
 * @param {object} opts - Alternately, you can pass the Todo content as
 * an object containing property-value pairs.
 *
 * The following properties are set by default:
 *
 * {boolean} Closed - false if the Todo is open (default), true otherwise
 * {string} CloseDate - the date when the Todo was closed, in format
 * "yyyy-mm-dd". According to the todo.txt format, the date must be set
 * for closed todos.
 * {string} Priority - (optional) the Todo's priority. Possible values
 * are "A", "B", and "C"; all others default to "Z" (no priority set).
 * {string} CreateDate - (optional) date when the Todo was created,
 * in format "yyyy-mm-dd"
 * {string} Description - (optional) the Todo's description.
 *
 * Beyond these, a Todo object can have further properties. The Todo()
 * function searches the Description for key-value-pairs and adds them
 * automatically to the object. Special consideration is given to the
 * the key "DueDate" which, if it is found, will be removed from the
 * Description. (Note that the due date will be re-added to the
 * Description when the Todo is being saved to local storage or
 * exported to file.)
 *
 */
function Todo(opts) {
//	console.log("Todo constructor: opts are " + opts);	//DEBUG
	// set defaults
	this.Closed = false;
	this.CloseDate = null;
	this.Priority = "Z";
	this.CreateDate = null;
	this.Description = "";

	// without options do nothing
	if ( typeof opts === undefined ) { return; }

	// or construct Todo from tablerow
	else if ( opts instanceof jQuery ) {
		this.Closed = opts.hasClass("todo-closed");
		this.CloseDate = this.Closed ? opts.children("td.todo-status").attr("title").slice(-10) : null;
		this.Priority = opts.children("td.todo-prio").html() == "not set" ? "Z" : opts.children("td.todo-prio").html(),
		this.CreateDate = opts.children("td.todo-desc").is("[title]") ? opts.children("td.todo-desc").attr("title").slice(-10) : null;
		this.Description = _unescape(opts.children("td.todo-desc").html()),
		this.addKeyValuePairs();
		if ( opts.children("td.todo-duedate").html().trim() != "" ) {
			this.DueDate = opts.children("td.todo-duedate").html();
		}
		return;
	}

	// or construct Todo from todo.txt source
	else if ( typeof opts == "string" ) {
		if ( opts.trim() == "" ) { return; };

		this.Source = opts.trim();
		var splitString = this.Source.split(/\s+/g);

		// is todo closed?
		if ( splitString[0] == "x" ) {
			this.Closed = true;
			splitString.shift();

			// close date
			var closeDate = new Date(splitString[0].substr(0, 10));
			this.CloseDate = isNaN(closeDate.getDate()) ? (new Date()).toISOString().substr(0, 10) : splitString[0];
			splitString.shift();
		};

		// Priority
		if ( splitString[0].search(/\([ABC]\)/i) > -1 ) {
			this.Priority = splitString.shift().substr(1, 1).toUpperCase();
		};

		// when was the todo created?
		var createDate = new Date(splitString[0].substr(0, 10));
		if ( ! isNaN(createDate.getDate()) ) {
			this.CreateDate = createDate.toISOString().substr(0, 10);
			splitString.shift();
		};

		// Description (the rest)
		this.Description = splitString.join(" ");
		this.addKeyValuePairs();

		return;
	}

	// or construct Todo from parameters
	else if ( typeof opts == "object" ) {
		for ( var key in opts ) {
			if ( key == "Closed" && typeof opts["Closed"] == "boolean" ) {
				this.Closed = opts["Closed"];
			} else if ( key == "CloseDate" && this.Closed && typeof opts["CloseDate"] == "string" && opts["CloseDate"].match(/\d\d\d\d-\d\d-\d\d/) != null ) {
				this.CloseDate = opts["CloseDate"];
			} else if ( key == "Priority" && typeof opts["Priority"] == "string" && opts["Priority"].match(/[ABCZ]/) != null ) {
				this.Priority = opts["Priority"];
			} else if ( key == "CreateDate" && typeof opts["CreateDate"] == "string" && opts["CreateDate"].match(/\d\d\d\d-\d\d-\d\d/) != null ) {
				this.CreateDate = opts["CreateDate"];
			} else if ( key == "Description" && typeof opts["Description"] == "string" ) {
				this.Description = opts["Description"];
				this.addKeyValuePairs();
			} else {
				this[key] = opts[key];
			}
		}
		return;
	}
};


// form a valid todo.txt string from a Todo object
Todo.prototype.toSource = function() {
	return [
		this.Closed ? "x " + this.CloseDate + " " : "",
		this.Priority == "Z" ? "" : "(" + this.Priority + ") ",
		this.CreateDate ? this.CreateDate + " " : "",
		this.Description,
		this.DueDate ? " DueDate:" + this.DueDate : ""
	].join("");
};


// get key-value pairs from a description and add them to the object
Todo.prototype.addKeyValuePairs = function() {
	if ( this.Description == "" ) { return; }

	// iterate over space-separated description chunks
	var splitString = this.Description.split(" ");
	for ( i = 0; i < splitString.length; i++ ) {
		var colon = splitString[i].indexOf(":");
		if ( colon > -1 ) {
			// keep existing value or set new one
			var key = splitString[i].substr(0, colon);
			this[key] = this[key] || splitString[i].slice(colon+1);

			// only if key equals DueDate: remove k-v-pair from Description
			if ( key == "DueDate" ) {
				var j = this.Description.indexOf("DueDate:"),
					k = this.Description.indexOf(" ", j);
				this.Description = [
					j = 0 ? "" : this.Description.substr(0, j-1),
					k < 0 ? "" : this.Description.slice(k+1)
				].join(j != 0 && k >= 0 ? " " : "");
			}
		}
	}
};


/* ***********************************************
 *
 * Functions that add/delete/modify table rows
 *
 * ***********************************************
 */

// adds a todo to the top of the table
function addTodoTablerow(todo) {
	// build tablerow
	var urgencyLevel = _getUrgencyLevel(todo["Closed"], todo["DueDate"]),
		tr = [
'          <tr class="todo todo-', todo["Closed"] ? 'closed' : 'open', ' priority-', todo["Priority"], ' urgency-', urgencyLevel, '">\n',
'            <td class="todo-status text-center"', todo["Closed"] ? ' title="closed on ' + todo["CloseDate"] + '"><span class="glyphicon glyphicon-ok" />' : '>', '</td>\n',
'            <td class="todo-prio text-center">', todo["Priority"] == "Z" ? 'not set' : todo["Priority"], '</td>\n',
'            <td class="todo-desc"', todo["CreateDate"] != null ? ' title="created on ' + todo["CreateDate"] + '">' : '>', todo["Description"], '</td>\n',
'            <td class="todo-duedate text-center"', todo["CreateDate"] != null ? ' title="created on ' + todo["CreateDate"] + '">' : '>', "DueDate" in todo ? todo["DueDate"] : '', '</td>\n',
'            <td class="todo-actions text-right">\n',
'              <div class="btn-group btn-group-xs">\n',
'                <button type="button" title="edit" class="btn btn-default glyphicon glyphicon-pencil action-edit', todo["Closed"] ? ' disabled' : '', '" />\n',
'                <button type="button" title="', todo["Closed"] ? 're-open' : 'close', '" class="btn btn-default ', todo["Closed"] ? 'action-reopen glyphicon-refresh' : 'action-close glyphicon-ok', ' glyphicon" />\n',
'                <button type="button" title="delete" class="btn btn-default glyphicon glyphicon-trash action-delete" />\n',
'              </div>\n',
'            </td>\n',
'          </tr>\n'];

	// add todo to top of table
	$("tbody#sortable").prepend(tr.join(""));

	// add button handlers
	$("tbody#sortable").children().first().find("button.action-edit").on("click", handleEditTodo);
	$("tbody#sortable").children().first().find("button.action-close").on("click", handleCloseTodo);
	$("tbody#sortable").children().first().find("button.action-reopen").on("click", handleReopenTodo);
	$("tbody#sortable").children().first().find("button.action-delete").on("click", handleDeleteTodo);
};


// update a tablerow
function updateTodoTablerow($tr, params) {
	if ( ! $tr instanceof jQuery || typeof params != "object" ) {
		return false;
	}
console.log("updateTodoTablerow: keys are " + Object.keys(params));	//DEBUG

	for ( var key in params ) {
		if ( key == "Closed" ) {
			if ( params.Closed == $tr.hasClass("todo-closed") ) { continue; }
			if ( params.Closed ) {	// todo is being closed
				// update tr classes
				$tr
					.removeClass("todo-open urgency-1 urgency-2 urgency-3 urgency-4 urgency-5")
					.addClass("todo-closed urgency-0")
				// update status column
					.find("td.todo-status")
						.attr("title", "closed on " + params.CloseDate != null ? params.CloseDate : (new Date()).toISOString().substr(0,10))
						.html('<span class="glyphicon glyphicon-ok" />')
					.end()
				// update button classes, title, handler
					.find(".action-close")
						.removeClass("glyphicon-ok action-close")
						.addClass("glyphicon-refresh action-reopen")
						.attr("title", "re-open")
						.off("click")
						.on("click", handleReopenTodo)
					.end()
					.find(".action-edit")
						.addClass("disabled");
			} else {	// todo is being reopenend
				// update tr's classes
				$tr
					.removeClass("todo-closed urgency-0")
					.addClass("todo-open urgency-" + _getUrgencyLevel(false, $tr.children("td.todo-duedate").html()))
				// update status column
					.find("td.todo-status")
						.removeAttr("title")
						.empty()
					.end()
				// update button class, title, handler
					.find(".action-reopen")
						.removeClass("glyphicon-refresh action-reopen")
						.addClass("glyphicon-ok action-close")
						.attr("title", "close")
						.off("click")
						.on("click", handleCloseTodo)
					.end()
					.find(".action-edit")
						.removeClass("disabled");
			}
		}	// endif Closed
		if ( key == "CloseDate" ) {
			if ( ! ( params.Closed || $tr.hasClass("todo-closed") ) || isNaN(new Date(params.CloseDate)) ) {
				continue;
			} else {
				$tr.find("td.todo-status").attr("title", "closed on " + params.CloseDate);
			}
		}	// endif CloseDate
		if ( key == "Priority" ) {
			$tr.find("td.todo-prio")
				.html(params.Priority)
			.end()
			.removeClass("priority-A priority-B priority-C priority-Z")
			.addClass(["priority-", String(params.Priority).match(/[ABC]/) != null ? params.Priority : "Z"].join(""));
		}	// endif Priority
		if ( key == "CreateDate" ) {
			if ( isNaN(new Date(params.CreateDate)) ) { continue; }
			$tr.find("td.todo-desc").attr("title", "created on " + params.CreateDate);
		}	// endif CreateDate
		if ( key == "Description" ) {
			$tr.find("td.todo-desc").html(params.Description);
		}	// endif Description
		if ( key == "DueDate" ) {
			if ( isNaN(new Date(params.DueDate)) && ! params.DueDate == "" ) {
				continue;
			}
			$tr.find("td.todo-duedate")
				.html(params.DueDate)
			.end()
			.removeClass("urgency-0 urgency-1 urgency-2 urgency-3 urgency-4 urgency-5")
			.addClass("urgency-" + _getUrgencyLevel(params.Closed || $tr.hasClass("todo-closed"), params.DueDate));
		}	// endif DueDate
	}
};


// deletes a todo row from the table; empty the parent node completely if it was the only row
function deleteTodoTablerow($tr) {
	if ( ! $tr instanceof jQuery ) { return false; }
	if ( $tr.siblings().length > 0 ) {
		$tr.remove();
	} else {
		$tr.parent().empty();
	};
};


/* ***********************************************
 *
 * Functions for saving/loading from local storage
 *
 * ***********************************************
 */

// load todos from local storage
function loadTodos() {
	if ( localStorage.webtodo == null ) { return false; }

	// remove existing table rows
	$("tr.todo").each( function() {
		deleteTodoTablerow($(this));
	});

	// add todos in reverse order
	var todos = localStorage.webtodo.split("\n");
console.log("Loading Todos:\n" + todos.join("\n")); //DEBUG
	for ( var i = todos.length; i > 0; i-- ) {
		if ( todos[i-1].trim() != "" ) {
			addTodoTablerow(new Todo(todos[i-1]));
		}
	}
	_collectProjectsAndContexts();
}


// save todos to local storage
function saveTodos() {
	var todos = [];
	$("tr.todo").each( function() {
		todos.push((new Todo($(this))).toSource());
	});
	localStorage.webtodo = todos.join("\n");
console.log("Saving todos:\n" + todos.join("\n"));
};


/* ***********************************************
 *
 * Now come the event handler functions
 *
 * ***********************************************
 */

// handler for the "Add Todo" button
function handleAddTodo(event) {
	var $modal = $("#todoModal");

	// prepare and show modal
	$modal.find(".modal-body")
		.hide()
		.filter("#addEditBody")
			.show();
	$modal.find("h4#todoModalTitle")
		.html("Add Todo");
	$modal.find('input[name=todoModalRadio][value=Z]')
		.prop('checked', true);
	$modal.find('input#todoModalDesc')
		.val("");
	$modal.find('input#todoModalDueDate')
		.val("");
	$modal
		.off("shown.bs.modal")
		.on("shown.bs.modal", function (e) {
			$("#todoModalDesc").focus();
		});
	$modal.modal("show");

	// use asynchronous API to wait for user input
	var promise = _getTodoModalPromise();

	// OK
	promise.done( function() {
		addTodoTablerow(new Todo({
			Priority: $modal.find("input[name=todoModalRadio]:checked").val(),
			CreateDate: (new Date()).toISOString().substr(0, 10),
			Description: $modal.find("input#todoModalDesc").val(),
			DueDate: $modal.find("input#todoModalDueDate").val(),
		}));
		saveTodos();
		_collectProjectsAndContexts();
	});

	// tidy up
	promise.always( function() {
		$modal.modal("hide");
	});
};


// handler for close buttons
function handleCloseTodo(event) {
	updateTodoTablerow($(event.target).parents("tr.todo"), {
		Closed: true,
		CloseDate: (new Date()).toISOString().substr(0, 10)
	});
	saveTodos();
};


// handler for the "Delete Todo" buttons
function handleDeleteTodo(event) {
	var $modal = $("#todoModal"),
		$tr = $(event.target).parents("tr.todo");

	// prepare and show modal
	$modal.find(".modal-body")
		.hide()
		.filter("#deleteBody")
			.show();
	$modal.find("h4#todoModalTitle")
		.html("Delete Todo");
	$modal.modal("show");

	// use asynchronous API to wait for user input
	var promise = _getTodoModalPromise();

	// OK
	promise.done( function() {
		deleteTodoTablerow($tr);
		saveTodos();
		_collectProjectsAndContexts();
	});

	// tidy up
	promise.always( function() {
		$modal.modal("hide");
	});
};


// handler for the "Edit Todo" buttons
function handleEditTodo(event) {
	var $modal = $("#todoModal"),
		$tr = $(event.target).parents("tr.todo"),
		prio = $tr.children("td.todo-prio").html() == "not set" ? "Z" : $tr.children("td.todo-prio").html();

	// prepare and show modal
	$modal.find(".modal-body")
		.hide()
		.filter("#addEditBody")
			.show();
	$modal.find("h4#todoModalTitle")
		.html("Edit Todo");
	$modal.find('input#todoModalRadio' + prio)
		.prop('checked', true);
	$modal.find('input#todoModalDesc')
		.val(_unescape($tr.children("td.todo-desc").html()));
	$modal.find('input#todoModalDueDate')
		.val($tr.children("td.todo-duedate").html());
	$modal
		.off("shown.bs.modal")
		.on("shown.bs.modal", function (e) {
			$("#todoModalDesc").focus();
		});
	$modal.modal("show");

	// use asynchronous API to wait for user input
	var promise = _getTodoModalPromise();

	// OK
	promise.done( function() {
		// update todo values
		var newPrio = $modal.find("input[name=todoModalRadio]:checked").val();
		updateTodoTablerow($tr, {
			Priority: newPrio == "Z" ? "not set" : newPrio,
			Description: $modal.find("input#todoModalDesc").val(),
			DueDate: $modal.find("input#todoModalDueDate").val(),
		});
		saveTodos()
		_collectProjectsAndContexts();
	});

	// tidy up
	promise.always( function() {
		$modal.modal("hide");
	});
};


// export todos to file
function handleExportTodos(event) {
	// prepare file object
	var blob = new Blob([localStorage.webtodo], {type: "text/plain"});
	var a = $("#exportButton")[0];
	a.href = URL.createObjectURL(blob);

	// trigger download
	a.download = "todo.txt";
	_raiseMessage("Todos exported to file.", "success");
};


// show all todos, reset filter inputs
function handleFilterReset(event) {
	$("tr.todo").show();
	$("#filterText").val("");
	$("input:checkbox.filterPrio").prop("checked", true);
	$("input:radio#filterRadioAll").prop("checked", true);
};


// filter table rows
function handleFilterTodos(event) {
	// reset text input on Escape key
	if ( event.type == "keyup" && event.keyCode == 27 ) {
		return handleFilterReset();
	};

	// collect filter settings
	var str = $("#filterText").val().toLowerCase(),
		prio = {
			A: $("#filterCheckboxPrioA").prop("checked"),
			B: $("#filterCheckboxPrioB").prop("checked"),
			C: $("#filterCheckboxPrioC").prop("checked"),
			Z: $("#filterCheckboxPrioZ").prop("checked"),
		},
		status = {
			open: ( $("input:radio#filterRadioOpen").prop("checked") || $("input:radio#filterRadioAll").prop("checked") ),
			closed: ( $("input:radio#filterRadioClosed").prop("checked") || $("input:radio#filterRadioAll").prop("checked") ),
		};

	// iterate over all todos
	$("tr.todo").each( function(index) {
		$(this).show();
		var todo = new Todo($(this));
		if ( todo.Description.toLowerCase().indexOf(str) == -1
			|| ! prio[todo.Priority]
			|| ( ! todo.Closed && ! status["open"] )
			|| ( todo.Closed && ! status["closed"] ) ) {
				$(this).hide();
		}
	})
}


// import todos from file
function handleImportTodos(event) {
	var $modal = $("#todoModal");

	// prepare and show modal
	$modal.find(".modal-body")
		.hide()
		.filter("#importBody")
			.show();
	$modal.find("h4#todoModalTitle")
		.html("Import Todos from File");
	$("#todoModal")
		.off("shown.bs.modal")
		.on("shown.bs.modal", function (e) {
			$("#importFile").focus();
		});
	$modal.modal("show");

	// use asynchronous API to wait for user input
	var promise = _getTodoModalPromise();

	// user clicked OK
	promise.done( function() {
		var fr = new FileReader();

		// onload() gets called once file has been fully read
		fr.onload = function(e) {

			// optional: delete existing todos
			if ( $("#todoModal #deleteExistingTodos").prop("checked") ) {
				$(".sort-link > span[class^=my-caret]").remove();
				$("tr.todo").each( function() {
					deleteTodoTablerow($(this));
				});
			}

console.log(e.target.result);	//DEBUG
			// iterate over lines from file in reverse order
			var lines = e.target.result.split("\n");
			for ( var i = lines.length; i > 0; i-- ) {
//console.log("import line is " + lines[i-1]);
				if ( lines[i-1].trim() != "" ) {
					addTodoTablerow(new Todo(lines[i-1]));
				}
			}
			saveTodos();
			_collectProjectsAndContexts();
			_raiseMessage("Todos imported from file.", "success");
		}

		// read file as string; readAsText() is asynchronous, therefore the hassle with onload()
		fr.readAsText($modal.find("input#importFile")[0].files[0]);
	});

	// tidy up
	promise.always( function() {
		$modal.modal("hide");
	});
}


// handler for reopen buttons
function handleReopenTodo(event) {
	updateTodoTablerow($(event.target).parents("tr.todo"), {
		Closed: false,
	});
	saveTodos();
}


// sort table rows
function handleSortTodos(event) {
	// find key to sort over
	var key = $(this).attr("id").slice(4).toLowerCase();
console.log("sorting by " + key);

	// comparator function for sortElements()
	function _comparator(a, b) {
		var a_low = $(a).html().toLowerCase(),
			b_low = $(b).html().toLowerCase()
		if ( a_low > b_low ) {
			return aAfterB;
		}
		if ( a_low < b_low ) {
			return bAfterA;
		}
		return 0;
	}

	// gets passed to sortElements(); we compare <td> elements but sort <tr>s
	function _getSortable() { return $(this).parent(); }

	// determine sort order
	// default is ascending, except for duedate
	var ascending = ( key == "duedate" ) ? false : true;
	// extra check if this was already the previous sort key
	if ( $(this).children("span[class^=my-caret]").length > 0 ) {
		ascending = $(this).children("span").hasClass("my-caret-up") ? false : true;
	}
	var aAfterB = ascending ? 1 : -1, bAfterA = -aAfterB;

	// do the sorting
	$("td.todo-" + key).sortElements(_comparator, _getSortable);

	// update caret symbols after sort links
	$(".sort-link > span[class^=my-caret]").remove();
	$(this).append(['<span class="my-caret-', ascending ? 'up' : 'down', '" />'].join(""));
}


/* ***********************************************
 *
 * when document is ready, add handlers etc.
 *
 * ***********************************************
 */
$(document).ready(function(){
	// add filter handlers
	$("#filterText").on("keyup", handleFilterTodos);
	$("input:checkbox.filterPrio, input:radio.filterStatus").on("change", handleFilterTodos);
	$("#filterButton").on("click", handleFilterTodos);
	$("#filterReset").on("click", handleFilterReset);

	// add import/export handlers
	$("#importButton").on("click", handleImportTodos);
	$("#exportButton").on("click", handleExportTodos);

	// add handler for sort links
	$(".sort-link").on("click", handleSortTodos);

	// add handler for "Add Todo"
	$("#addTodoButton").on("click", handleAddTodo);

	// add key handler to modal that submits form on enter key
	$("#todoModal").on("keydown", function (e) {
		if ( e.keyCode === $.ui.keyCode.ENTER  ) {
			$("#todoModalOK").trigger("click");
		}
	});

	// add key handler to description input field that tweaks a few key behaviors
	$("input#todoModalDesc").on("keydown", function(e) {
		if ( e.keyCode === $.ui.keyCode.TAB && $($(this).autocomplete('widget')).is(":visible") ) {
			// tab, menu visible: prevent moving focus to next input
			e.preventDefault();
		} else if ( e.keyCode === $.ui.keyCode.ESCAPE && $($(this).autocomplete('widget')).is(":visible") ) {
			// escape, menu visible: store cursor position for close handler
			$(this).data("cursorPos", this.selectionStart);
		} else switch ( e.keyCode ) {
			// all keys that may change the partial search term: close autocomplete menu (and force a new search)
			case $.ui.keyCode.LEFT:
			case $.ui.keyCode.RIGHT:
			case $.ui.keyCode.BACKSPACE:
			case $.ui.keyCode.DELETE:
			case $.ui.keyCode.END:
			case $.ui.keyCode.HOME:
			case $.ui.keyCode.SPACE:
				$(this).autocomplete("instance").close();
				break;
		}
	});

	// initialize drag-n-drop functionality for table rows
	$("tbody#sortable").sortable({
		cursor: "move",
		delay: 150,
		forcePlaceholderSize: true,
		helper: _sortableHelperFix,
		opacity: 0.8,
		placeholder: "ui-state-highlight",
		revert: 200,
		tolerance: "pointer",
	});

	// initialize autocomplete functionality for description input element
	$("input#todoModalDesc").autocomplete({
		close: _autocompleteClose,
		delay: 100,
		focus: _autocompleteFocus,
		minLength: 0,
		select: _autocompleteSelect,
		source: _autocompleteSource,
	});

	// load todos from browser storage
	loadTodos();
});
