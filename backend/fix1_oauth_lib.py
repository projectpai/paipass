# django oauth toolkit has serious issues with extending the application model.
# this is a fix for that...
migration_path = './oauth2/migrations/0001_initial.py'

s = ''
s += ' '*4 + 'run_before = [\n'
s += ' '*8 + "('oauth2_provider', '0001_initial'),\n"
s += ' '*4 + ']\n'
# after this line we want to add the above code in "s"
migration_line = 'class Migration(migrations.Migration):'

out = ''

with open(migration_path, 'r') as f:
    for line in f:
        out += line
        if migration_line in line:
            out += s

with open(migration_path, 'w') as f:
    f.write(out)
