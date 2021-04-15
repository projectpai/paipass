import os

import django
from django.core.management import call_command
from django.db.migrations.loader import MigrationLoader
from django.core.management.commands.makemigrations import Command as MakeMigrationsCommand
from django.db import DEFAULT_DB_ALIAS, connections
import psycopg2

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

def get_app_names_in_db():
    conn = psycopg2.connect(f"dbname='{os.environ['PAIPASS_DB_NAME']}'"
                            f" user='{os.environ['SQL_USER']}'"
                            f" host='{os.environ['SQL_HOST']}'"
                            f" password='{os.environ['SQL_PASS']}'")
    curr = conn.cursor()
    curr.execute("""SELECT table_name FROM information_schema.tables  WHERE table_schema = 'public'""")
    app_names = set()
    for table_tuple in curr.fetchall():
        table = table_tuple[0]
        if 'identity_verification' in table:
            app_name = 'identity_verification'
        else:
            app_name = table.split('_')[0]
        app_names.add(app_name)
    return app_names

def run_initial_migrations():
    '''The initial migrations have a special ordering that needs to be preserved'''
    import subprocess
    subprocess.call('/code/run_initial_migrations.sh')



# adopted from the fn show_list
# https://github.com/django/django/blob/stable/3.0.x/django/core/management/commands/showmigrations.py
def migrate():
    """
    Show a list of all migrations on the system, or only those of
    some named apps.
    """
    connection = connections[DEFAULT_DB_ALIAS]
    # Load migrations from disk/DB
    loader = MigrationLoader(connection, ignore_no_migrations=True)
    graph = loader.graph
    # reversed because the "users" app needs to come first otherwise we'll have a circular
    # dependency to "api" app
    app_names = reversed(sorted(loader.migrated_apps))
    app_names_in_db = get_app_names_in_db()
    if len(app_names_in_db) < 1:
        print("Running Initial migrations")
        run_initial_migrations()
    elif len(app_names_in_db) < 12:
        raise Exception(f'We have found {len(app_names_in_db)} tables in {os.environ["PAIPASS_DB_NAME"]}'
              f' which likely means that the bare minimum migrations are not present')
    else:
        print(f'We have found {len(app_names_in_db)} tables in {os.environ["PAIPASS_DB_NAME"]}'
              f' and are assuming that the initial migrations have been run on the db (which'
              f' does not necessarily mean that the migrations have been created in python).')
    # For each app, print its migrations in order from oldest (roots) to
    # newest (leaves).
    for app_name in app_names:
        shown = set()
        for node in graph.leaf_nodes(app_name):
            for plan_node in graph.forwards_plan(node):
                if plan_node not in shown and plan_node[0] == app_name:
                    # Give it a nice title if it's a squashed one
                    title = plan_node[1]
                    if graph.nodes[plan_node].replaces:
                        title += " (%s squashed migrations)" % len(graph.nodes[plan_node].replaces)
                    applied_migration = loader.applied_migrations.get(plan_node)
                    # Mark it as applied/unapplied
                    if applied_migration:
                        output = ' [X] %s' % title
                        output += ' (applied at %s)' % applied_migration.applied.strftime('%Y-%m-%d %H:%M:%S')
                        print(output)
                    else:
                        print(" [ ] %s" % title)
                        call_command('makemigrations', app_name)

                        # if app_name not in app_names_in_db:
                        #     call_command('migrate', app_name)
                        call_command('migrate', app_name)
                    shown.add(plan_node)
        # If we didn't print anything, then a small message
        if not shown:
            print(" (no migrations)")
            call_command('makemigrations', app_name)

            if app_name not in app_names_in_db:
                call_command('migrate', app_name)




if __name__ == '__main__':
    import subprocess
    migrate()
