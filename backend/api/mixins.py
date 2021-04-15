from django.contrib.auth.mixins import LoginRequiredMixin


class PaipassLoginRequiredMixin(LoginRequiredMixin):
    redirect_field_name = 'goTo'
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return self.handle_no_permission()
        return super().dispatch(request, *args, **kwargs)