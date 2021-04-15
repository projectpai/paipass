import inspect

def is_primitive_obj(obj):
    return isinstance(obj, bool) or isinstance(obj, int)

def _print_object(tag, obj, depth=3, num_newlines=3,
                 print_traceback=False, return_only=False,
                 indent_level=0, indent_char=' '*2,
                 skip_primitive_objects=True):
    ''' poor man's debugger '''
    if skip_primitive_objects and is_primitive_obj(obj):
        return False, ''
    success = False
    indent = indent_char*(1+indent_level)
    header = f'The dissection of the object {obj.__class__.__name__} is:' + '\n'
    output = []
    output.append( '\n'*num_newlines)
    if indent_level > 0:
        # remove one character to give it's own indent
        output.append(indent[1:] + header)
    else:
        output.append(header)
    if depth < 1:
        print('output', output, flush=True)
        return success, output
    for attr in dir(obj):
        if not attr.startswith('_'):
            output_i = []
            try:
                val = getattr(obj, attr, 'VALUE NOT FOUND')
                if inspect.ismethod(val) or \
                   inspect.isfunction(val) or \
                   inspect.isbuiltin(val):
                    continue
                if val is None:
                    output_i.append("None")
                else:
                    print('output_i 1', output_i, attr, val, flush=True)
                    success_i, output_i = _print_object(tag, obj=val,
                                                       depth=depth-1,
                                                       indent_level=indent_level+1,
                                                       num_newlines=1,
                                                       print_traceback=print_traceback)
                    print('output_i 2', output_i, flush=True)
                    if success_i:
                        print('output_i 3', output_i, flush=True)
                        output_i.insert(0, str(val) + '\n')
                        print('output_i 4', output_i, flush=True)

                success = True
            except:
                if print_traceback:
                    import traceback
                    output_i.append(traceback.format_exc())
                else:
                    output_i.append("Value lookup gave an error")
            print('output_i 5', output_i, flush=True)
            output_i.insert(0, f'{attr[:32]}')
            output.append( output_i)
            #output.append(indent + f'{attr[:32]}{indent_char[:128]}{val}\n')
    output.append('\n' * num_newlines)
    print('output', output, flush=True)
    return success, output

def print_object(tag, obj, depth=3, num_newlines=3,
                 print_traceback=True, return_only=False,
                 indent_level=0, indent_char=' '*2,
                 skip_primitive_objects=True):

    _, s =_print_object(tag, obj, depth, num_newlines, print_traceback,
                        return_only, indent_level, indent_char,
                        skip_primitive_objects)
    tagged_output = unravel(tag, s, num_newlines, indent_level, indent_char)
    return tagged_output

def unravel(tag, items, num_newlines, indent_level, indent_char):

    tagged_output = ''
    for item in items:
        if isinstance(item, list):
            item = unravel(tag, items, num_newlines, indent_level, indent_char)
        tagged_output += tag + 4*' ' + str(item) + '\n'
    return tagged_output


if __name__ == '__main__':
    class A:
        def __init__(self, mapping, s='a', a=None):
            self.mapping = mapping
            self.s = s
            self.a = a
            self.c = 1
    d = {'hello': 'world', 'a' : {'b', 'c'}}
    b = A(d)
    a = A(d, a=b)
    success, output = print_object('test', a, print_traceback=True)
    print(output)
