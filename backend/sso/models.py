from django.db import models
from django.conf import settings

from django.utils.translation import gettext_lazy as _


class DiscourseSsoAuthorization(models.Model):

    APPROVED_ATTRS = {'name', 'email'}

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="discourse_sso_user",
        null=False, blank=False, on_delete=models.CASCADE
    )

    is_approved = models.BooleanField(default=False)

    status_changed_on = models.DateTimeField(auto_now_add=True)
    '''
    Future-proofing it by putting it at 64.
    
    This can be found in the source for discourse at:
    
        https://github.com/discourse/discourse/blob/master/app/models/discourse_single_sign_on.rb#L18
    
    Which corresponds to Ruby's source (https://api.rubyonrails.org/v3.0.9/classes/ActiveSupport/SecureRandom.html#method-c-hex)
        
        hex(n=nil)
    
        SecureRandom.hex generates a random hex string.
        
        The argument n specifies the length of the random length. The length of the result string is twice of n.
        
        If n is not specified, 16 is assumed. It may be larger in future.
        
        If secure random number generator is not available, NotImplementedError is raised.
    
    '''

    nonce = models.CharField(max_length=64)

    @property
    def name(self):
        return self.user.full_name

    @property
    def email(self):
        return self.user.email



class DiscourseSsoGrant(models.Model):

    '''At a minimum, authorizing discourse via sso requires that the user
     allows for access to their external_id and email; this grant applies to anything else
      the user may allow discourse to access.'''

    discourse_sso_auth = models.ForeignKey(DiscourseSsoAuthorization,
                                           on_delete=models.CASCADE)

    attribute_name = models.CharField(_("Attribute Name"), max_length=64)


