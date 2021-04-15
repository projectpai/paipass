import os
from pathlib import Path
import shutil

INIT_PY_FNAME = '__init__.py'

dir_needs_revisiting = set()

ROOT_ROOT = os.environ['PAIPASS_BACKEND_SRC']
print(f'ROOT_ROOT {ROOT_ROOT}')


def recursively_add_init_py(dirpath):
    if dirpath == ROOT_ROOT:
        return
    p = os.path.join(dirpath, INIT_PY_FNAME)
    if not os.path.exists(p):
        print(f'Adding __init__.py to {dirpath}')
        Path(p).touch()
    new_dirpath = os.path.dirname(dirpath)
    return recursively_add_init_py(new_dirpath)


for root, dirnames, filenames in os.walk(ROOT_ROOT):
    for filename in filenames:
        if filename.endswith('.py'):
            p = os.path.join(root, INIT_PY_FNAME)
            if not os.path.exists(p):
                print(f'Adding __init__.py to {root}')
                Path(p).touch()
                if root != ROOT_ROOT:
                    parent_dir = os.path.dirname(root)
                    dir_needs_revisiting.add(parent_dir)

for dir_i in dir_needs_revisiting:
    recursively_add_init_py(dir_i)

# Remove anything that wouldn't allow us to import a folder
# as a module like a hyphen in a folder name
for root, dirnames, filenames in os.walk(ROOT_ROOT):
    if '-' in root:
        root2 = root.replace('-', '_')
        print(f'Changing directory \n{root}\n to \n{root2}\n')
        shutil.move(root, root2)


# The imports in the __init__.py in this path are not relative
# and break our ability to be able to import into our project.
# It's a hack for sure, but I don't want to invest the time in
# learning the ins and outs of importlib nor do I want to
# disturb the (source controlled) integrity of any source located
# in "third_party."
def replace_rel_path(path, starts_with):
    s = ''
    does_start_with = lambda line, starts_with: any(line.startswith(sw_i) for sw_i in starts_with)
    with open(path, 'r') as f:
        for line in f:

            if does_start_with(line, starts_with):
                words = line.split(' ')
                words[1] = '.' + words[1]
                s += ' '.join(words)
            else:
                s += line

    with open(path, 'w') as f:
        f.write(s)


dirpath_parts = [ROOT_ROOT,
                 'third_party',
                 'mit',
                 'paicoin',
                 'contrib',
                 'data_share',
                 'client_example',
                 'paicointxn']

to_path = lambda fname: os.path.join(*(dirpath_parts + [fname]))

sw = ('from constants',
      'from reference',
      'from unpacker',
      'from pai',
      'from transaction')

fnames = ('__init__.py',
          'transaction.py',
          'reference.py',
          'unpacker.py',
          'pai.py',
          'constants.py')

for fname in fnames:
    replace_rel_path(to_path(fname), sw)
