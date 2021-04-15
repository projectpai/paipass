# django oauth toolkit has serious issues with extending the application model.
# this is a fix for that...
oauth_lines = ['OAUTH2_PROVIDER_APPLICATION_MODEL', 
               #'OAUTH2_PROVIDER_ACCESS_TOKEN_MODEL',
               #'OAUTH2_PROVIDER_GRANT_MODEL',
               #'OAUTH2_PROVIDER_REFRESH_TOKEN_MODEL'
              ]

s = ''
settings_path = './backend/settings.py'
# barely awake and thus a little out of energy; sorry if you have to read this
finder = lambda line:  [o_line for o_line in oauth_lines if o_line in line]

with open(settings_path, 'r') as f:
    for line in f:
        # overwrite any lines that are in the oauthlib that were previously
        # commented out...
        which = finder(line)
        if len(which) > 0:
            line = line.replace('#'+which[0], which[0]) 
        s += line
with open(settings_path, 'w') as f:
    f.write(s)

