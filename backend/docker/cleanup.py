import os
import shutil

PAIPASS_DIRECTORY = os.environ['PAIPASS_DIRECTORY']

def remove(root, name):
    path = os.path.join(root, name)
    if not os.path.exists(path):
        return None
    if os.path.isfile(path):
        os.remove(path)
    elif os.path.isdir(path):
        shutil.rmtree(path)
    else:
        print(f'This path was not recognized {path}')
        return None
    print(f'Removed {path}')
    return path

def remove_migration_file(root, filename):
    prefix = filename[:4]
    ext = filename.split('.')[-1]
    dirname = os.path.basename(root)
    if prefix.isdigit() and ext == 'py' and dirname == 'migrations':
        remove(root, filename)


def remove_migration_dir(root, dirname):
    parent_dirname = os.path.basename(root)
    if parent_dirname == 'oauth2' and dirname == 'migrations':
        path = remove(root, dirname)
        return path

def remove_pycache_file(root, filename):
    ext = filename.split('.')[-1]
    if ext == 'pyc' or ext == 'pyo':
        remove(root, filename)

def remove_pycache_dir(root, dirname):
    if dirname == '__pycache__':
        path = remove(root, dirname)
        return path


def remove_dir(root, dirname):
    paths = set()
    fn_rm_dirs = [remove_pycache_dir, remove_migration_dir]
    for fn_rm_dir in fn_rm_dirs:
        path = fn_rm_dir(root, dirname)
        if path:
            paths.add(path)
    return paths


def clean():
    doesnt_exist = set()
    for root, dirnames, filenames in os.walk(PAIPASS_DIRECTORY):
        if root in doesnt_exist:
            continue
        for filename in filenames:
            # migration files
            remove_migration_file(root, filename)
            remove_pycache_file(root, filename)

        for dirname in dirnames:
            paths = remove_dir(root, dirname)
            doesnt_exist = doesnt_exist.union(paths)



if __name__ == '__main__':
    clean()

