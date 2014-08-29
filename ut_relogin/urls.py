from django.conf.urls import url, patterns

from ut_relogin.views import ReloginRedirect, FormProtectionView

urlpatterns = patterns(
    '',
    url(
        r'^ut_relogin/redirect/$',
        ReloginRedirect.as_view(),
        name='ut_relogin_redirect',
    ),
    url(
        r'^ut_relogin/form_protection/$',
        FormProtectionView.as_view(),
        name='ut_relogin_form_protection',
    ),
)
