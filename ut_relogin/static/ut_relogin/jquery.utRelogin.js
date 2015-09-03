/**
 * @fileOverview
 * A jQuery plugin to detect when the user's UTLogin session has expired and
 * allow them to relogin without seeing spurious error messages from failed,
 * same-origin-violating AJAX requests. It can also protect form submission.
 *
 * https://github.com/UT-Austin-FIS/ut_relogin
 *
 * @name utRelogin
 * @author Eric Petersen <epetersen@austin.utexas.edu>
 * @author Adam Connor <adam.conor@austin.utexas.edu>
 * @author Todd Graves <tgraves@austin.utexas.edu>
 * @author Jason Oliver <jeoliver@austin.utexas.edu>
 * @version 2.0.0
 * @requires jQuery 1.7+ (developed against 1.11.1)
 *
 * Usage:
 *
 * Although it is provided as a jQuery plugin, it is intended to be installed
 * with a stand-alone version of jQuery, since its primary purpose is to modify
 * the browser's native XMLHttpRequest object. Therefore, usage is simple:
 *
 * <script type="text/javascript" src="path/to/jquery-1.11.1.min.js"></script>
 * <script type="text/javascript" src="path/to/jquery.utRelogin.js"></script>
 * <script type="text/javascript">
 *     $jqUtRelogin = $.noConflict(true);
 *     $jqUtRelogin.utRelogin({
 *         popupUrl: 'path/to/relogin/page.html',
 *         popupOptions: 'options to window.open (see below)',
 *         showDialog: true,
 *         autoCloseDialog: false,
 *         formProtectSelector: 'form[method=post]'
 *         formProtectUrl: 'path/to/any/page.html',
 *         formProtectRetry: false,
 *     });
 * </script>
 *
 * The relogin target page should call back to the opening page by invoking
 * window.opener.utrelogin.postLogin(). This will call all the callback
 * functions that the original page has added via
 * window.utrelogin.addPostLoginCallback().
 *
 * See: http://stackoverflow.com/questions/6884616/intercept-all-ajax-calls
 */

window.utrelogin = {}; // claim a global scope.

/**
 * Allow consuming applications to re-bind form protection handlers to any
 * forms that may have shown up after document-ready.
 *
 * @type {Function}
 */
window.utrelogin.rebindFormProtectHandlers = function(){};

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
 * Clear out the callback registry
 *
 * @type {Function}
 */
window.utrelogin.clearPostLoginCallbacks = function(){
    window.utrelogin.callbacks = [];
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
    window.utrelogin.clearPostLoginCallbacks();
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
     * utRelogin options and default values - see README
     *
     * @private
     * @type {object}
     */
    var defaultOptions = {
        'popupUrl': '/',
        'popupOptions': 'toolbar=yes,scrollbars=yes,resizable=yes,' +
                        'dependent=yes,height=500,width=800',
        'showDialog': true,
        'autoCloseDialog': false,
        'formProtectSelector': 'form[method=post]',
        'formProtectUrl': '/',
        'formProtectRetry': false,
    };

    /**
     * Whether to show log messages in the console.
     */
    var showLog = /(local|dpdev1\.dp)\.utexas\.edu$/.test(window.location.hostname);

    /**
     * Log messages consistently.
     *
     * @param {String,Object} msg
     *     Message or object to log
     * @private
     */
    function log(msg) {
        if (showLog) {
            var logTime = new Date().getTime();
            var prefix = '==> [' + logTime + '] (jQuery.utRelogin) --> ';
            if (typeof msg === 'string') {
                console.info(prefix + msg);
            } else {
                console.info(prefix + '[object: ' + msg + ']...');
                console.info(msg);
            }
        }
    }

    /**
     * Check whether the browser supports setting property descriptors on an
     * XMLHttpRequest instance. Most browsers do, but IE <9 and Safari 5, 6,
     * and 7 do not. The result of this check determines how/if we deal with
     * relogin.
     *
     * @private
     * @type {boolean}
     */
    var canConfigureXhrOrsc = (function(){
        var canConfigure = true;
        var xhr = new XMLHttpRequest();
        // In Firefox, and maybe other browsers, we need to open the request
        // for xhr.onreadystatechange to exist at all.
        xhr.open('GET', '/', true);
        var props = Object.getOwnPropertyDescriptor(xhr, 'onreadystatechange');
        if (props && props.hasOwnProperty('configurable')) {
            canConfigure = props.configurable;
        }
        xhr.abort();
        return canConfigure;
    })();

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

        function formHandler(event) {
            event.preventDefault();
            var $form = $(event.target);

            // See if we should submit by clicking a button or by direct
            // submission, in case there is no button.
            var submitViaClick = false;
            var $btn = $form.data('ut-relogin-btn-clicked');
            if ($btn && $btn.length) {
                submitViaClick = true;
            }
            $form.data('ut-relogin-btn-clicked', null);

            var submitForm = function(){
                if (submitViaClick) {
                    $btn.click();
                } else {
                    $form.submit();
                }
            };
            if (opts.formProtectRetry) {
                window.utrelogin.addPostLoginCallback(submitForm);
            }
            $.ajax({
                type: 'GET',
                url: opts.formProtectUrl,
                success: submitForm,
            });
        }
        function bindHandlers(){
            if (opts.formProtectSelector !== ''){
                $(opts.formProtectSelector).each(function(i, elem){
                    var $f = $(elem);
                    var $btns = $f.find('input[type="submit"], button[type="submit"]');
                    if (!$f.data('utrelogin_handler_bound')) {
                        $f.one('submit', formHandler);
                        $f.data('utrelogin_handler_bound', true);
                        // Keep track of whether a button triggered the
                        // submission, in case it has a name and value that
                        // need to be submitted.
                        $btns.on('click', function(event){
                            $f.data('ut-relogin-btn-clicked', $(event.target));
                        });
                    }
                });
            }
        }
        $(document).ready(bindHandlers);
        window.utrelogin.rebindFormProtectHandlers = bindHandlers;

        var xhr_open = XMLHttpRequest.prototype.open;
        var xhr_send = XMLHttpRequest.prototype.send;

        function createAndShowDialog(){
            if ($('#utRelogin-dialog').size()) {
                return $('utRelogin-dialog');
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
                'Your session expired after 60 minutes of inactivity. ',
                'Use the UTLogin page to return to the application.',
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
            xhr_open.call(this, method, url, async, user, pass);
        }

        function new_send(data){
            var scc =  state_change_closure(this, this.onreadystatechange);
            var no_call = false; // used by state_change to decide whether to call old.
            var sc_complete = false;
            var otherOrscHandler;

            function startLogin(){
                if (opts.showDialog) {
                    var $d = createAndShowDialog();
                    window.utrelogin.addPostLoginCallback(function() {
                        if (opts.autoCloseDialog) {
                            destroyAndHideLoginDialog($d);
                        } else {
                            $d.find('p').text(
                                'Login successful. Repeat your last action.'
                            );
                        }
                    });
                }
                window.open(opts.popupUrl, 'UTReloginWindow', opts.popupOptions);
            }

            function state_change_closure(self, old){
                if (!old) {
                    old = function(){};
                }
                otherOrscHandler = old;

                function state_change(){
                    if (self.readyState === 4) {
                        sc_complete = true;

                        if (self.status === 0) {
                            self._same_origin_error = true;
                        } else {
                            window.utrelogin.clearPostLoginCallbacks();
                        }
                    }

                    if (self._same_origin_error) {
                        delete self._current_error; // we can assume this was the error
                        log('same origin error inferred; aborting request');
                        self.abort();
                        startLogin();
                    } else {
                        otherOrscHandler.call(self);
                    }
                }
                return state_change;
            }

            this._data = data;

            if (this._async) {
                this.onreadystatechange = scc;

                // jQuery will set onreadystatechange *after* calling send,
                // which would normally replace the onreadystatechange function
                // we just set here. Let's intercept that modification so we
                // don't get completely overridden.
                //
                // NOTE: This won't work in IE <9, since defineProperty was
                // only implemented for DOM objects then, and we're modifying a
                // native JavaScript object here.

                if (canConfigureXhrOrsc) {
                    Object.defineProperty(this, 'onreadystatechange', {
                        configurable: false,
                        enumerable: false,
                        get: function () {
                            // It seems that this doesn't actually get called,
                            // perhaps since the native XMLHttpRequest.send
                            // does some fancy native method calling thing?
                            //
                            // Let's return something just in case.
                            return scc;
                        },
                        set: function (newValue) {
                            // Instead of letting other scripts like jQuery
                            // overwrite our handler completely, let's
                            // overwrite the *other* handler, which we'll call
                            // after doing our thing.
                            otherOrscHandler = newValue;
                        },
                    });
                } else {
                    // TODO: enable some kind of fall-back behavior?
                }
            }

            try {
                xhr_send.call(this, data);
            } catch (err) {
                // we need to defer action on this -- if it is a same origin error,
                // we can ignore it if login is triggered.
                this._current_error = err;
            } finally {
                // firefox doesn't fire on synchronous calls, but we need scc called
                if (!(this._async || sc_complete)) {
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
