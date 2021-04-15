def toCamelCase(ss, depth=0):
    if isinstance(ss, str):
        ss = [ss]
    for i in range(len(ss)):
        if '_' in ss[i]:
            ss[i] = toCamelCase(ss[i].split('_'))
        elif ' ' in ss[i]:
            ss[i] = toCamelCase(ss[i].split(' '))
        elif depth == 0 and len(ss) == 1:
            ss = ''.join(ss)
            return ss[0].lower() + ss[1:]
        else:
            ss[i] = list(ss[i])
            ss[i][0] = ss[i][0].upper()
            ss[i] = ''.join(ss[i])

    ss = ''.join(ss)
    if depth == 0:
        return ss[0].lower() + ss[1:]
    return ss


if __name__ == '__main__':
    sc = 'not_in_camel_case'
    assert toCamelCase(sc) == 'notInCamelCase'
    sc = 'Title'
    assert toCamelCase(sc) == 'title'
    sc = 'Secondary Image Title'
    assert toCamelCase(sc) == 'secondaryImageTitle'
    print("Success!")