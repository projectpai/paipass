import shortuuid
import numpy as np



num_runs = 100000

num_uuids_b4_colission = []
for i in range(num_runs):
    uuids = set()
    max_num_bytes_for_uuid = float('-inf')
    min_num_bytes_for_uuid = float('inf')
    i = 0

    while True:
        uuid = shortuuid.ShortUUID().random(length=4)
        l = len(uuid.encode('ascii'))
        if l > max_num_bytes_for_uuid:
            max_num_bytes_for_uuid = l
        if l < min_num_bytes_for_uuid:
            min_num_bytes_for_uuid = l
        if uuid in uuids:
            break
        uuids.add(uuid)
        i+=1
        if i % 1000 == 0:
            print(f'{i} uuids collected')
    num_uuids_b4_colission.append(len(uuids))
    print(f'Collision! Num runs {len(uuids)}')
    print(f'Max len {max_num_bytes_for_uuid}')
    print(f'Min len {min_num_bytes_for_uuid}')
print(f'After {num_runs} runs, \n\n'
      f' \tthe average number of uuids before a collision'
      f' was {np.average(num_uuids_b4_colission)}\n'
      f' \t the minimum number of uuids before a collision'
      f' was {np.min(num_uuids_b4_colission)}\n'
      f' \t the maximum number of uuids before a collision'
      f' was {np.max(num_uuids_b4_colission)}\n'
      )