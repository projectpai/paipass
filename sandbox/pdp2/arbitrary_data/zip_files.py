import zipfile
import random

RAND_INT_RANGE = (1,100)
def wrf(fname):
    with open(fname, 'w') as f:
        for i in range(100):
            f.write(str(random.randint(*RAND_INT_RANGE)))

fnames = []
for i in range(10):
    fname = 'file' + str(i) + '.txt'
    wrf(fname)
    fnames.append(fname)

dirpaths = set()
with zipfile.ZipFile('myzip.zip', 'w', compression=zipfile.ZIP_DEFLATED) as zf:
    for fname in fnames:

        dirpath = '/dirpath'+str(random.randint(*RAND_INT_RANGE))
        # let's not have duplicate dirpaths.
        while dirpath in dirpaths:
            dirpath = '/dirpath' + str(random.randint(*RAND_INT_RANGE))
        zf.write(fname, arcname=dirpath+'/'+fname)
        dirpaths.add(dirpath)

print('dirpaths', dirpaths)
print('fnames', fnames)
