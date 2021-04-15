from pprint import PrettyPrinter

pp = PrettyPrinter(indent=4)

d_i = {'ICU':
           [
               {'ucsd': {
                         'ucsd0001': {
                          'num_files': 100,
                          'notes': "Patient's signal doesn't have good SNR until 5 minutes in.",
                          'files': ['ucsd0001_0001.h5', 'ucsd0001_0002.h5', 'ucsd0001_0003.h5']
                          },
                         'ucsd0002': {
                          'num_files': 100,
                          'notes': "ICO Signal is missing.",
                          'files': ['ucsd0002_0001.h5', 'ucsd0002_0002.h5', 'ucsd0002_0003.h5']
                          }
                         }
                }
           ]
}
d = {'patient_datasets': d_i}

pp.pprint(d)
