ut_relogin
==========

Catches failed AJAX requests for resources under UTLogin where there failure is
due to an expired session, allowing the user to login again to retry the action
that triggered the original AJAX request. Also protects POSTs by making a
synchronous AJAX call to ensure the session is still active.

## Dependencies
* `jquery.utRelogin.js`:
  * IE 9+, Firefox, Chrome, Safari(?), other modern browsers(?)
* `ut_relogin`, the Django app:
  * Python 2.6+
  * Django 1.4+
  * Optional: A `UTDirectContext` class

Setup - PyPE/Django
===================

To include this app in your PyPE project, simply pull it into your project via
`svn:externals` and place it on your `PYTHONPATH`. For example, if you're using
the `utdirect.utils.setup_extra()` functionality with a project-level folder
named 'extra', you can use these `svn:externals` parameters:

> path: extra/ut_relogin

> URL: https://github.com/UT-Austin-FIS/ut_relogin/tags/v0.2/ut_relogin

Then, install it into your Django project:

1. Add "`ut_relogin`" to your `INSTALLED_APPS` setting:
    ```python
    # settings.py
    # ...
    INSTALLED_APPS = (
        # ...
        'ut_relogin',
        # ...
    )
    ```

1. Add the middleware to your `MIDDLEWARE_CLASSES` setting:
      ```python
      # settings.py
      # ...
      MIDDLEWARE_CLASSES = (
          # ...
          'ut_relogin.middleware.UtReloginHeadTagMiddleware',
          # ...
      )
      ```

1. Set up a URL to be opened in the popup window after login:

  1. If you want to use the template and URL provided in this app, you
     must provide a context class and message, and install our URLconf.

    1. Tell `ut_relogin` what context class (that inherits from
       `UTDirectContext`) and message to use:
          ```python
          # settings.py
          # ...
          UT_RELOGIN_CONTEXT = 'mygroup.myproject.myapp.mycontext.MyContextClass'
          UT_RELOGIN_MESSAGE = 'You are now logged in; repeat your previous action.'
          ```

    1. Add the URLs to your root URLconf:
          ```python
          # urls.py
          # ...
          import ut_relogin.urls

          urlpatterns = (
              # ...
              url(r'^', include(ut_relogin.urls)),
          )
          ```

  1. If you want to write your own page for the popup window, which you need to
     do if you're not using `UTDirectContext`, you should add a URL with the
     name `ut_relogin_redirect` that exhibits the behavior you want for the
     popup window. You also need a URL named `ut_relogin_form_protection`
     that simply returns the text 'ok' to all GET queries.

Setup - non-Django
==================

The resources in this repo can be used in any context. Essentially, this
project is an "app-ification" of the `jquery.utRelogin.js` plugin that was done
to make it easier to reliably inject it into existing Django apps.

If you look at the middleware in `ut_relogin/middleware.py`, you'll see the
`<script>` tags necessary to add this plugin to your own web application in
whatever language (webAgent, PHP, Java, etc.).

Ideally, you'd include this repo with `svn:externals` if you're using Subversion,
or perhaps with subtree merges if you're using git. If you're adding `ut_relogin`
to a webAgent application, you'll just want to download a tagged version of the
relevant JavaScript files and add them to your source directory.

In addition to getting the two source files and the calling script into your
application, you will probably also want to create a web page to have UTLogin
redirect your users to. The URL to this webpage will need to be provided as a
configuration option to `ut_relogin`.

Here's what it should look like:

```html
<head>
  <!-- ... -->

  <script src="url/to/your/copy/of/jquery-1.11.1.min.js"></script>
  <script src="url/to/your/copy/of/jquery.utRelogin.js"></script>
  <script>
    var $jqUtRelogin = jQuery.noConflict(true);
    $jqUtRelogin.utRelogin({
        'popupUrl': 'url/to/your/redirect/page.html',
        'formUrl': 'url/to/any/page.html'
    });
  </script>

  <!-- ... -->
</head>
```

Options
=======
The configuration options you can pass to $.utRelogin are the following:

* `popupUrl`
  * the URL to open in the login window, to which UTLogin will redirect the
    user after login
  * *default*: `'/'`
* `popupOptions`
  * options to pass to `window.open()` for controlling the login browser window
  * *default*: `'toolbar=yes,scrollbars=yes,resizable=yes,dependent=yes,height=500,width=800'`
* `showDialog`
  * whether to show a dialog on the parent page when opening the login window
  * *default*: `true`
* `formProtectSelector`
  * the jQuery selector to which to attach "submit" listeners - the listener does
    a AJAX request to force the AJAX logic to take place before the form
    submission, preventing submissions while the session is expired
  * make it a blank string to disable this behavior
  * *default*: `form[method=post]`
* `formProtectUrl`
  * the URL to call to protect form submission
  * *default*: `'/'`


Explanation
===========

Before the transition to [UTLogin](http://www.utexas.edu/its/utlogin/), under
[Central Web Authentication](http://www.utexas.edu/its/utlogin/Compare%20to%20CWA)
(CWA), AJAX requests that were sent with an invalid session received 200-status
responses from the CWA machinery. Despite being a "success" in HTTP terms,
these responses could be inspected for clues indicating that they in fact
came from failed authentication, instead of containing the intended data.
FIS has a jQuery plugin called `utRelogin` that did just that.

Under UTLogin, however, requests with expired sessions are redirected to a
central server on a different subdomain, which the browser cannot follow
because of its
[same-origin policy](http://en.wikipedia.org/wiki/Same-origin_policy). The
browser can't send the original request to this host, so it reports the attempt
as a failure. Because the browser handles the original redirect response,
there is no way to inspect it from JavaScript code, say to inspect the Location
header to see if it's pointing at the UTLogin host.

This project attempts to provide consistent user experience in apps using the
old `utRelogin` by detecting expired sessions and giving the user a login
window.

## The Old Way: Central Web Authentication

In the old CWA system, every host implemented the same login page. Thus,
whenever the user's session became invalid, either because it expired or they
logged out, any further requests would be redirected to a path **on the same
host** where the user could login again and get new cookies. The login form
would redirect them back to their original location via a GET; any POST data
would be lost, and the destination page would be responsible for dealing with
the unexpected GET from the logon form.

The older `utRelogin` plugin would intercept form submissions and AJAX requests
when the response from the host was the login page. It would put up a jQuery
modal with the login page, let the user enter their credentials, and then close
the modal and re-submit the original request. This no longer works under
UTLogin for reasons discussed in the next section.

## The New Way: UTLogin

There are two relevant, major differences in behavior under UTLogin:
* All login pages are served from a single host; while every host under UTLogin
  has something installed to connect it to UTLogin, the only place that users
  will be getting login pages is from the central UTLogin host.
* The login page doesn't allow itself to be embedded in an iframe, due to its
  `X-Frame-Options: Deny` HTTP header.

Any request made on a host under UTLogin passes through the UTLogin agent
software. If a valid session is detected, the request is passed along
like normal. If the session is not valid, the agent software will redirect
the user to the central UTLogin server. This happens both when the user
makes their first request to a new host after logging in, and when their
session has become invalid.

### Plain GET/POST

When the user requests a resource without a valid session, the agent software
on that host intervenes and sends back a redirect to the central UTLogin
server. The user then enters their credentials and submits the form. If the
credentials are valid, UTLogin issues a POST back to the original resource. The
agent on the original host grabs the credentials from the POST body, sets a
cookie, and redirects the user to their original destination, using the
original HTTP verb and POST or GET data.

### AJAX

If an application attempts to make an AJAX request after the user's session
expires, the UTLogin machinery will redirect the request to the login host,
which is a cross-domain request that the browser will prohibit.

Similarly, although most users will have already done a normal request to the
host to get the JavaScript code that does AJAX requests, it's also possible
that the first request to a host **after** login in is an AJAX request. For
example, the user could have two windows open with resources from two different
UTLogin servers. Say their session expires and they re-authenticate on host A;
if they switch to their host B window and take an action on the still-loaded
page that triggers an AJAX request, that request will fail, since the redirect
cycle still needs to happen on host B.

`ut_relogin` addresses this situation by giving the user a new login window
that redirects to host B after login. If the user already has a valid session
and only needs to go through the UTLogin redirect cycle, the window that opens
will accomplish that. Otherwise, they will be prompted to enter their
credentials on the normal UTLogin page. Then, the user can redo their action
that triggered the AJAX call, which will now behave normally.
