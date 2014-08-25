from django.conf.urls import url, patterns

from ut_relogin.views import ReloginRedirect

urlpatterns = patterns(
    '',
    url(
        r'^ut_relogin/redirect/$',
        ReloginRedirect.as_view(),
        name='ut_relogin_redirect',
    ),
)
