// http://stackoverflow.com/questions/6884616/intercept-all-ajax-calls

window.utrelogin = {}; // claim a global scope.

/**
 * Callback registry; needs to live at global scope
 *
 * @type {Object}
 */
window.utrelogin.callback_registry = {};

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
    };

    /**
     * Whether to show log messages in the console.
     */
    var showLog = /local\.utexas\.edu$/.test(window.location.hostname);

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

        function startLogin(){
            log('opening login window');
            window.open(opts.redirectUrl, null, opts.popupOptions);
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

            function state_change_closure(self, old){
                if (!old){
                    old = function(){};
                }
                otherOrscHandler = old;

                function state_change(){
                    log('readyState: ' + self.readyState + '; status: ' + self.status);

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
                // NOTE: This won't work in IE 8, since defineProperty is only
                // implemented for DOM objects there, and we're modifying a
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
                        // Instead of letting other scripts overwrite our
                        // handler, let's overwrite the other handler that
                        // we'll call after doing our thing.
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
