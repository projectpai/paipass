import json
import os
from dataclasses import dataclass
from uuid import uuid4
import shutil
import zipfile

from django.conf import settings

from pdp2 import pdp2
from .models import FieldDataTypeChoices, Field, Data, DatasetWatchTypeChoices

from core.blockchain.projectpai.paicoin import paicoin_cli


class YggUrls:
    DATA_URL = r'api/v1/yggdrasil/data/'


class Nein:
    pass


class FieldWrapper:

    def __init__(self, schema):
        self.schema = schema

    @property
    def name(self):
        return self.schema.name

    @property
    def data_type(self):
        return FieldDataTypeChoices.OBJECT.upper()

    @property
    def id(self):
        return self.schema.id


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


def is_file_like(data_type):
    data_type = data_type.upper()
    if data_type == FieldDataTypeChoices.FILE.upper() \
            or data_type == FieldDataTypeChoices.IMAGE.upper() \
            or data_type == FieldDataTypeChoices.VIDEO.upper():
        return True
    return False


def get_field_hierarchy(field):
    fields = []
    while field is not None:
        fields.append(field)
        field = field.group
    fields = list(reversed(fields))
    return fields


def hierarchy_to_dirpath(fields):
    s = settings.AGGREGATED_DATA_DIR + '/'
    for field in fields:
        s += field.name + '/'
    return s


def get_files_from_dataset(dataset):
    files = {}
    for data in Data.objects.all().filter(dataset=dataset):
        if is_file_like(data.field.data_type) and data.data_file:
            dirpath = hierarchy_to_dirpath(get_field_hierarchy(data.field))
            arcpath = os.path.join(dirpath, os.path.basename(data.data_file.name))
            files[arcpath] = data.data_file
    return files


def aggregate_data(base_data, files):
    # need a directory to work from within
    dirpath = os.path.join(settings.AGGREGATED_DATA_DIR, str(uuid4()))
    if not os.path.exists(dirpath):
        os.makedirs(dirpath)
    base_data_path = os.path.join(dirpath, 'base_data')

    with open(base_data_path, 'w') as f:
        f.write(json.dumps(base_data))

    paths = {}
    paths[base_data_path] = base_data_path
    for arcpath, fyle in files.items():
        path = os.path.join(dirpath, os.path.basename(fyle.name))
        while path in paths:
            path = os.path.join(dirpath, os.path.basename(fyle.name) + str(uuid4()))
        with open(path, 'wb') as f:
            # make sure we're at the beginning of the data
            f.seek(0)
            for chunk in fyle.chunks():
                f.write(chunk)

        paths[path] = arcpath

    agg_path = os.path.join(settings.AGGREGATED_DATA_DIR, f'{uuid4()}.zip')
    watchdog = 0
    while os.path.exists(agg_path):
        agg_path = os.path.join(settings.AGGREGATED_DATA_DIR, f'{uuid4()}.zip')
        watchdog += 1
        if watchdog > 10:
            raise Exception(f"Unable to make a file after nearly 10 attempts due to already existing path: {agg_path}")

    with zipfile.ZipFile(agg_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        for internal_path, arcpath in paths.items():
            zf.write(internal_path, arcname=arcpath)
    with open(agg_path, 'rb') as f:
        data = f.read()
    shutil.rmtree(dirpath)
    return data


def submit_aggregated_data(cfg, dataset, pdp2_sub, user):

    data = pdp2_dataset_to_json_dict(dataset)
    files = get_files_from_dataset(dataset)
    if len(files) > 0:
        data = aggregate_data(data, files)
        cfg.is_compressed = True

    return pdp2.submit_dataset(cfg, data, dataset, pdp2_sub, user)


class ORMDatasetNode:

    def __init__(self, field, is_file_remotely_mapped=False):
        self.field = field
        self.children = []
        # for stuff that's tangentially related. nothing in here affects the
        # inner workings of SchemaNode.
        self.tangent = {}
        self.parent = None
        self.value = Nein
        self.id = field.id
        self.data_id = None
        self._is_file_remotely_mapped = is_file_remotely_mapped

    def is_root(self):
        return self.parent is None

    @property
    def is_file_remotely_mapped(self):
        node = self
        while node.parent is not None:
            node = node.parent
        return node._is_file_remotely_mapped

    @property
    def name(self):
        return self.field.name

    @property
    def data_type(self):
        return self.field.data_type.upper()

    @classmethod
    def tree_from_dataset(cls, dataset, is_file_remotely_mapped=False):
        root = cls.tree_from_schema(dataset.schema, is_file_remotely_mapped=is_file_remotely_mapped)
        data = Data.objects.all().filter(dataset=dataset)
        for datum in data:
            root.add_datum(datum)
        return root

    @classmethod
    def tree_from_schema(cls, schema, starting_point=None, is_file_remotely_mapped=False):
        if starting_point is not None:
            root = cls(starting_point.field, is_file_remotely_mapped=is_file_remotely_mapped)
            root.parent = starting_point.parent
            fields = list(Field.objects.all().filter(schema=schema, group=starting_point.field))
        else:
            root = cls(FieldWrapper(schema), is_file_remotely_mapped=is_file_remotely_mapped)
            fields = list(Field.objects.all().filter(schema=schema))
        stack = [root]
        while len(stack) > 0:
            parent = stack.pop()
            indices = []
            for i, field in enumerate(fields):
                if parent.is_root() and field.group is not None:
                    continue
                if not parent.is_root() and field.group != parent.field:
                    continue
                child = ORMDatasetNode(field)
                child.parent = parent
                parent.children.append(child)
                stack.append(child)
                indices.append(i)

            for idx in reversed(indices):
                fields.pop(idx)
        return root

    def find_node_relative(self, fields, starting_point=None, should_find_empty_value=False):
        '''
        effectively finds the part of the (emptyish) constructed tree that we want to fill. this will also return
        a node that has already been filled in; if it does return a node that is already filled in, it is the job
        of the code using this method to recognize when it returns a filled in node and create a duplicate node.
        '''
        if starting_point is None:
            starting_point = self

        requested_node = None
        for node in starting_point:
            if node.field == fields[-1]:
                if requested_node is None or (requested_node is not None and node.value is Nein):
                    requested_node = node

        if requested_node is None: return requested_node

        i = -1
        node = requested_node
        while abs(i) - 1 < len(fields):
            field = fields[i]
            if field != node.field:
                return None
            node = node.parent
            i -= 1

        return requested_node

    def find_nearest_list(self, node):

        while node is not None:
            if node.field.data_type.upper() == FieldDataTypeChoices.LIST.upper():
                return node
            node = node.parent
        return None

    def add_list_child(self, list_node):
        # subroot? yes subroot, for your subrooting needs. subtree is probably more accurate
        # but this sounds more consistent in my half-awake state.
        subroot = self.__class__.tree_from_schema(self.field.schema, list_node.children[0])
        list_node.children.append(subroot)
        return subroot

    def add_node_value(self, node, datum, fields):
        if node.data_type == FieldDataTypeChoices.INTEGER.upper():
            try:
                node.value = int(datum.value)
            except:
                node.value = datum.value
        elif is_file_like(node.data_type):
            if self.is_file_remotely_mapped:
                node.value = settings.BACKEND_DOMAIN + YggUrls.DATA_URL + str(datum.id) + '/'
            else:
                if datum.data_file:
                    is_iterable = datum.field.data_type.upper() == FieldDataTypeChoices.LIST.upper()
                    dirpath = '/'
                    for field in fields:
                        if is_iterable or datum.field.name != field.name:
                            dirpath += field.name + '/'
                    fname = os.path.basename(datum.data_file.file.name)
                    node.value = dirpath + fname
                else:
                    node.value = None
        else:
            node.value = datum.value

    def add_datum(self, datum):

        fields = get_field_hierarchy(datum.field)

        node = self.find_node_relative(fields)
        assert node.data_type == datum.field.data_type.upper()
        is_primitive = lambda dt: dt != FieldDataTypeChoices.OBJECT.upper() and dt != FieldDataTypeChoices.LIST.upper()
        if node is not None and is_primitive(datum.field.data_type):
            if node.value is Nein:
                self.add_node_value(node, datum, fields)
            else:
                list_node_field = self.find_nearest_list(node)
                assert list_node_field is not None
                new_list_node_field_el = self.add_list_child(list_node_field)
                node = self.find_node_relative(fields, starting_point=new_list_node_field_el)
                assert node is not None
                self.add_node_value(node, datum, fields)
            node.data_id = datum.id

    @property
    def primitive_fields(self):
        for child in self.children:
            if child.data_type == FieldDataTypeChoices.OBJECT.upper() or child.data_type == FieldDataTypeChoices.LIST.upper():
                continue
            else:
                yield child

    def __str__(self):
        return self.name

    def __iter__(self):
        stack = [self]
        i = 0
        j = 0
        while i < len(stack):
            stack_len = len(stack)
            while j < stack_len:
                node = stack[j]
                yield node
                if len(node.children) > 0:
                    stack.extend(node.children)
                j += 1
            i = j

    def to_json(self, compact=False, is_in_camel_case=False):
        is_named = lambda parent: parent.data_type != FieldDataTypeChoices.LIST.upper()
        is_primitive = lambda t: t != FieldDataTypeChoices.LIST.upper() and t != FieldDataTypeChoices.OBJECT.upper()
        if is_in_camel_case:
            name = toCamelCase(self.name)
        else:
            name = self.name
        if compact:
            if self.parent is None:
                d = {}
            elif self.data_type == FieldDataTypeChoices.OBJECT.upper() and is_named(self.parent):
                d = {name: {}}
            elif self.data_type == FieldDataTypeChoices.OBJECT.upper() and not is_named(self.parent):
                d = {}
            elif self.data_type == FieldDataTypeChoices.LIST.upper():
                d = {name: []}
            elif is_primitive(self.data_type) and self.parent.data_type == FieldDataTypeChoices.OBJECT.upper():
                d = {name: self.value}
            elif is_primitive(self.data_type) and self.parent.data_type == FieldDataTypeChoices.LIST.upper():
                d = self.value
            for child_node in self.children:
                if self.parent is None:
                    d.update(child_node.to_json(compact, is_in_camel_case=is_in_camel_case))
                elif self.data_type == FieldDataTypeChoices.OBJECT.upper():
                    d.update(child_node.to_json(compact, is_in_camel_case=is_in_camel_case))
                elif self.data_type == FieldDataTypeChoices.LIST.upper():
                    d[name].append(child_node.to_json(compact, is_in_camel_case=is_in_camel_case))
                else:
                    raise Exception(f'Type {self.data_type} should not have children')

        else:
            d = {'name': name, 'count': 0, 'fieldType': self.data_type}
            if self.value is not Nein:
                d['value'] = self.value
            d['id'] = self.id
            d['data_id'] = self.data_id
            for child_node in self.children:
                d[f'field{d["count"]}'] = child_node.to_json(is_in_camel_case=is_in_camel_case)
                d['count'] += 1
        return d


class NodeField:

    def __init__(self, d):
        self.name = d['name']
        self._dict = d

    def __getitem__(self, item):
        return self._dict[item]

    def __contains__(self, item):
        return item in self._dict

    def get(self, item, default):
        return self._dict.get(item, default)


def get_shared_with(shared_with):
    if shared_with == 'everyone':
        shared_by = True
    else:
        shared_by = False
    return shared_by


@dataclass
class DataWatch:
    name: str = None
    pub_key_addr: str = None


def get_data_watch(watched_by):
    dw = DataWatch()
    name = watched_by.get('name', None)
    if name is None:
        return dw
    if name.upper() == 'PDP2':
        dw.name = DatasetWatchTypeChoices.PDP2
    else:
        raise Exception(f'Data watch {name} is not supported')
    return dw


class SchemaNode:

    def __init__(self, d, fyles=None, is_root=True):
        if 'tree' not in d:
            tree = d
        else:
            tree = json.loads(d['tree'])
        self.name = tree['name']
        if fyles is None:
            self.fyles = {}
            for key in d.keys():
                if key.lower().startswith('file'):
                    self.fyles[key] = d[key]
        else:
            self.fyles = fyles
        self.field_type = tree['fieldType'].upper() if 'fieldType' in tree else 'object'.upper()
        self.children, self.fields = self.generate_graph(tree)
        # for stuff that's tangentially related. nothing in here affects the
        # inner workings of SchemaNode.
        self.tangent = {}
        self.parent = None
        self.id = tree['id'] if 'id' in tree else None
        if is_root:
            self.cfg = tree.get('cfg', {})
            self.shared_with = self.cfg['shared_with'] if 'shared_with' in self.cfg else 'everyone'
            self.shared_with = get_shared_with(self.shared_with)
            watched_by = self.cfg['watched_by'] if 'watched_by' in self.cfg else {}
            self.data_watch = get_data_watch(watched_by)

        else:
            # it's not the root and there is no support for configurations that are at lower levels of the tree.
            pass


    def generate_graph(self, d):
        children = []
        fields = []
        for k in d:
            if not k.startswith('field') or k.endswith('Type'):
                continue
            field = d[k]
            field_type = d[k]['fieldType'].lower()

            if field_type == 'object' or field_type == 'list':
                children.append(SchemaNode(field, self.fyles, is_root=False))
                children[-1].parent = self
            elif field_type == 'file' or field_type == 'image' or field_type == 'video':
                # there's a unique identifier for each file. we want to replace the uid found in each
                # field['value'] with the file corresponding to field['value'] in self.fyles
                # in particular,
                for key in self.fyles.keys():
                    if field['value'] in key:
                        field['value'] = self.fyles[key]
                        break
                fields.append(NodeField(field))
            else:
                fields.append(NodeField(field))

        return children, fields

    def add_datum(self, datum):
        field = datum.field
        fields = []
        while field.group is not None:
            fields.append(field)
            field = field.group

    def __str__(self):
        return self.name

    def __iter__(self):
        stack = [self]
        i = 0
        j = 0
        while i < len(stack):
            stack_len = len(stack)
            while j < stack_len:
                node = stack[j]
                yield node
                if len(node.children) > 0:
                    stack.extend(node.children)
                j += 1
            i = j

    def iterate_all(self):
        ''' why doesn't iter work like this???'''
        for child in self:
            yield child
            for field in child.fields:
                yield field
        for field in self.fields:
            yield field

    def __getitem__(self, item):
        for el in self.iterate_all():
            if el.name.lower() == item:
                return el
        return None


class DatasetNode:

    def __init__(self, d):
        self.name = d['name']
        self.field_type = d['fieldType'].upper() if 'fieldType' in d else 'object'.upper()
        self.children = self.generate_graph(d)
        # for stuff that's tangentially related. nothing in here affects the
        # inner workings of SchemaNode.
        self.tangent = {}
        self.parent = None

    def generate_graph(self, d):
        children = []
        fields = []
        for k in d:
            if not k.startswith('field') or k.endswith('Type'):
                continue
            field = d[k]
            field_type = d[k]['fieldType'].lower()

            if field_type == 'object' or field_type == 'list':
                children.append(SchemaNode(field, is_root=False))
                children[-1].parent = self
            else:
                fields.append(NodeField(field))

        return children, fields

    def add_datum(self, datum):
        field = datum.field
        fields = []
        while field.group is not None:
            fields.append(field)
            field = field.group

    def __str__(self):
        return self.name

    def __iter__(self):
        stack = [self]
        i = 0
        j = 0
        while i < len(stack):
            stack_len = len(stack)
            while j < stack_len:
                node = stack[j]
                yield node
                if len(node.children) > 0:
                    stack.extend(node.children)
                j += 1
            i = j


def pdp2_dataset_to_json_dict(dataset, compact=True, is_in_camel_case=True):
    d = ORMDatasetNode.tree_from_dataset(dataset).to_json(compact=compact, is_in_camel_case=is_in_camel_case)
    if dataset.share_group.everyone:
        d['shared_with'] = 'everyone'
    else:
        d['shared_with'] = 'self'
    return d
