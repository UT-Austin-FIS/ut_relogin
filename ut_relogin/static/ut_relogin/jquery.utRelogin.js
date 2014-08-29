/**
 * @fileOverview
 * A jQuery plugin to detect when the user's UTLogin session has expired and
 * allow them to relogin without seeing spurious error messages from failed,
 * same-origin-violating AJAX requests. It MAY also protect form submission.
 *
 * @name utRelogin
 * @author Eric Petersen <epetersen@austin.utexas.edu>
 * @author Adam Connor <adam.conor@austin.utexas.edu>
 * @author Todd Graves <tgraves@austin.utexas.edu>
 * @version 2.0.0
 * @requires jQuery (developed against 1.11.1, but only requires plugin ability)
 *
 * Usage:
 *
 * Although it is provided as a jQuery plugin, it is intended to be installed
 * with a stand-alone version of jQuery, since it only modifies the native
 * XMLHttpRequest object. Therefore, usage is simple:
 *
 * <script src="path/to/jquery-1.11.1.min.js"></script>
 * <script src="path/to/jquery.utRelogin.js"></script>
 * <script>
 *     $jqUtRelogin = $.noConflict(true);
 *     $jqUtRelogin.utRelogin({
 *         redirectUrl: 'path/to/relogin/page.html',
 *         popupOptions: 'options to window.open (see below)',
 *         showDialog: true,
 *     });
 * </script>
 *
 * The relogin page should call back to the opening page by invoking
 * window.opener.utrelogin.postLogin(). This will call all the callback
 * functions that the original page has added using
 * window.utrelogin.addPostLoginCallback().
 *
 * See: http://stackoverflow.com/questions/6884616/intercept-all-ajax-calls
 */

window.utrelogin = {}; // claim a global scope.

/**
 * Callback registry; needs to live at global scope
 *
 * @type {Object}
 */
window.utrelogin.callbacks = [];

/**
 * Allow consuming applications to add callbacks to be run after login
 *
 * @type {Function}
 */
window.utrelogin.addPostLoginCallback = function(fn){
    window.utrelogin.callbacks.push(fn);
};

/**
 * Function to be called by the post-login page; intended to be accessed via
 * the window.opener object - window.opener.utrelogin.postLogin()
 *
 * Clears the callback registry after executing everything
 *
 * @type {Function}
 */
window.utrelogin.postLogin = function(){
    for (var i = 0; i < window.utrelogin.callbacks.length; i++) {
        window.utrelogin.callbacks[i]();
    }
    window.utrelogin.callbacks = []; // clear it out
};

(function(factory, window) {
    'use strict';

    /*global jQuery:false, define:false */

    /* --- Install the module --- */
    if (typeof define === 'function' && define.amd) {
        // TODO: This is really ugly. Is there a better way to pass non-AMD params?
        define('_windowGlobal', [], function() { return window; });
        define(['jquery', '_windowGlobal'], factory);
    } else {
        // relies on browser global jQuery
        factory(jQuery, window);
    }
}(function($, window, undefined) {
    'use strict';

    /**
     * utRelogin options and default values
     *
     * @private
     * @type {object}
     */
    var defaultOptions = {
        'redirectUrl': '/',
        'popupOptions': 'toolbar=yes,scrollbars=yes,resizable=yes,' +
                        'dependent=yes,height=500,width=800',
        'showDialog': true,
    };

    /**
     * Whether to show log messages in the console.
     */
    var showLog = /(local|dpdev1\.dp)\.utexas\.edu$/.test(window.location.hostname);

    /**
     * Log messages consistently.
     *
     * @param {String} msg
     *     Message to log
     * @private
     */
    function log(msg) {
        if (showLog) {
            var logTime = new Date().getTime();
            console.info('==> [' + logTime + '] (jQuery.utRelogin) --> ' + msg);
        }
    }

    /**
     * Main function of the module. Call this to set it up.
     *
     * @public
     * @param {Object} configOptions
     *     Configuration options
     *
     * @returns {void}
     */
    function utRelogin(configOptions) {
        if (typeof configOptions !== 'object') {
            configOptions = {};
        }
        var opts = $.extend({}, defaultOptions, configOptions);

        var xhr_open = XMLHttpRequest.prototype.open;
        var xhr_send = XMLHttpRequest.prototype.send;

        function createAndShowDialog(){
            if ($('#utRelogin-dialog').size()) {
                return;
            }

            var Z_INDEX = 9999999;

            var $dialog = $('<div id="utRelogin-dialog"></div>');
            $dialog.css({
                'position': 'absolute',
                'top': '0%',
                'bottom': '0%',
                'left': '0%',
                'right': '0%',
                'background': 'transparent'
            });

            var $dialogBackground = $('<div></div>');
            $dialogBackground.css({
                'position': 'fixed',
                'top': '0%',
                'bottom': '0%',
                'left': '0%',
                'right': '0%',
                'background': '#DDD',
                'z-index': Z_INDEX,
                'opacity': '0.8'
            });

            var $contentDiv = $([
                '<div>',
                '<div>',
                '<button>Close</button>',
                '<p>',
                'Your UTLogin session has expired. ',
                'Please log in again in the popup window to continue.',
                '</p>',
                '</div>',
                '</div>'
            ].join(''));
            $contentDiv.css({
                'position': 'fixed',
                'top': '25%',
                'left': '20%',
                'right': '20%',
                'background': 'white',
                'padding': '10px',
                'z-index': Z_INDEX + 1
            });
            $contentDiv.find('div').css({
                'width': '100%',
                'font-weight': 'bold',
                'border-bottom': '1px solid #DDD',
                'margin-bottom': '5px',
                'padding-bottom': '5px'
            });
            $contentDiv.find('button').css({
                'font-weight': 'normal',
                'float': 'right',
                'display': 'block'
            });

            log('adding dialog to body');
            $dialog.append($dialogBackground);
            $dialog.append($contentDiv);
            $('body').append($dialog);

            $contentDiv.click(function(event) {
                event.stopPropagation();
            });

            $dialog.click(function(event) {
                event.stopPropagation();
                destroyAndHideLoginDialog($dialog);
            });

            function escapeHandler(event) {
                if (event.which === 27 /* ESC */) {
                    destroyAndHideLoginDialog($dialog);
                }
            }
            $dialog.data('utRelogin.escapeHandler', escapeHandler);

            $(window).keydown(escapeHandler);

            $contentDiv.find('button').click(function() {
                destroyAndHideLoginDialog($dialog);
            });

            return $dialog;
        }

        function destroyAndHideLoginDialog($dialog) {
            var escapeHandler = $dialog.data('utRelogin.escapeHandler');
            $(window).off('keydown', null, escapeHandler);
            $dialog.remove();
        }

        function new_open(method, url, async, user, pass){
            this._open_args = arguments;
            this._async = async;
            this._same_origin_error = null;
            this._current_error = undefined;
            log('calling original XMLHttpRequest.open');
            xhr_open.call(this, method, url, async, user, pass);
        }

        function new_send(data){
            var scc =  state_change_closure(this, this.onreadystatechange);
            var no_call = false; // used by state_change to decide whether to call old.
            var sc_complete = false;
            var otherOrscHandler;

            function startLogin(){
                if (opts.showDialog) {
                    createAndShowDialog();
                }
                log('opening login window');
                window.open(opts.redirectUrl, null, opts.popupOptions);
            }

            function state_change_closure(self, old){
                if (!old){
                    old = function(){};
                }
                otherOrscHandler = old;

                function state_change(){
                    log('in state_change - readyState: ' + self.readyState);

                    if (self.readyState === 4){
                        log('state changes are complete');
                        sc_complete = true;

                        if (self.status === 0){
                            log('same origin error inferred');
                            self._same_origin_error = true;
                        }
                    }

                    if (self._same_origin_error){
                        delete self._current_error; // we can assume this was the error
                        log('aborting request');
                        self.abort();
                        startLogin();
                    } else {
                        log('calling other onreadystatechange handler...');
                        otherOrscHandler.call(self);
                    }
                }
                return state_change;
            }

            this._data = data;

            if (this._async){
                log('adding our onreadystatechange function');
                this.onreadystatechange = scc;

                // jQuery will set onreadystatechange *after* calling send,
                // which would normal replace the onreadystatechange function
                // we just set here. Let's intercept that modification so we
                // don't get completely overridden.
                //
                // NOTE: This won't work in IE <9, since defineProperty was
                // only implemented for DOM objects then, and we're modifying a
                // native JavaScript object here.
                Object.defineProperty(this, "onreadystatechange", {
                    configurable: false,
                    enumerable: false,
                    get: function () {
                        // It seems that this doesn't actually get called,
                        // perhaps since the native XMLHttpRequest.send does
                        // some fancy native method calling thing?
                        //
                        // Let's return something just in case.
                        log('getting onreadystatechange...hello!');
                        return scc;
                    },
                    set: function (newValue) {
                        // Instead of letting other scripts like jQuery
                        // overwrite our handler completely, let's overwrite
                        // the *other* handler, which we'll call after doing
                        // our thing.
                        log('changing other onreadystatechange function...');
                        otherOrscHandler = newValue;
                    },
                });
            }

            try {
                log('calling original XMLHttpRequest.send');
                xhr_send.call(this, data);
            } catch (err) {
                log('caught an error');
                // we need to defer action on this -- if it is a same origin error,
                // we can ignore it if login is triggered.
                this._current_error = err;
            } finally {
                // firefox doesn't fire on synchronous calls, but we need scc called
                if (!(this._async || sc_complete)){
                    log('request is not async OR state change is not complete');
                    no_call = true; // because user code
                    scc();
                }
                delete self._same_origin_error;
            }
        }

        XMLHttpRequest.prototype.open = new_open;
        XMLHttpRequest.prototype.send = new_send;
    }

    $.utRelogin = utRelogin;
    return utRelogin;
  },
  this));
