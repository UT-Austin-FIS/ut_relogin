ut_relogin
==========

Catches failed AJAX requests under UTLogin when a user is logged out, allowing them to login again.

Usage
=====

To include this app in your Django project, simply pull it into your project via `svn:externals` and place it on your PYTHONPATH. For example, using the `utdirect.utils.setup_extra()` functionality provided by PyPE, you can use these parameters:

> path: extra/ut_relogin

> URL: ~~https://github.com/UT-Austin-FIS/ut_relogin/tags/v1.0/ut_relogin~~

Setup
=====

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

1. Add the `ut_relogin` middleware to your `MIDDLEWARE_CLASSES` setting:
      ```python
      # settings.py
      # ...
      MIDDLEWARE_CLASSES = (
          # ...
          'ut_relogin.middleware.UtReloginHeadTagMiddleware',
          # ...
      )
      ```

1. Add the URLs for `ut_relogin`:
      ```python
      # urls.py
      # ...
      import ut_relogin.urls

      urlpatterns = (
          # ...
          url(r'^', include(ut_relogin.urls)),
      )

      ```

Explanation
===========
Before the transition to [UTLogin](http://www.utexas.edu/its/utlogin/), under
[Central Web Authentication](http://www.utexas.edu/its/utlogin/Compare%20to%20CWA),
AJAX requests that were sent with an invalid session received 200-status
responses from the CWA machinery. Despite being a "success" in HTTP terms,
these responses could be inspected for clues indicating that they in fact
came from failed authentication, instead of containing the intented data.

Under UTLogin, however, requests with expired sessions are redirected to a
central server, login.utexas.edu, which the browser cannot follow because of
the same origin policy. The browser can't send the original request to
login.utexas.edu, so it reports the attempt as a failure.

...
