import json
from collections import namedtuple
from enum import Enum


class FieldDataTypeChoices:
    OBJECT = 'OBJECT'
    LIST = 'LIST'
    TEXT = 'TEXT'
    DATE = 'DATE'



Field = namedtuple('Field', ('schema', 'name', 'date_type', 'group'))


def list_generator(l):
    for item in l:
        yield item


class Objects:

    def __init__(self):
        self._objects = []

    def is_good_obj(self, obj, **filter_params):
        for key, expected_value in filter_params.items():
            actual_value = getattr(obj, key, None)
            if (actual_value is None and expected_value is not None) or actual_value != expected_value:
                return False
        return True

    def all(self):
        # Hack! no time to figure out/simulate what Django is actually doing here.
        return self

    def filter(self, **filter_params):
        if len(filter_params) < 1:
            return self._objects
        filtered = []
        for obj in self._objects:
            if self.is_good_obj(obj, **filter_params):
                filtered.append(obj)
        return filtered

    def append(self, obj):
        self._objects.append(obj)


class DjangoORM:
    def __new__(cls, *args, **kwargs):
        if getattr(cls, 'objects', None) is None:
            cls.objects = Objects()
        return super().__new__(cls)

    def __init__(self):
        self.__class__.objects.append(self)

    def __str__(self):
        return self.name

class Field(DjangoORM):
    def __init__(self, schema, name, data_type, group=None):
        super().__init__()
        self.schema = schema
        self.name = name
        self.data_type = data_type
        self.group = group



Data = namedtuple('Data', ('dataset', 'field', 'value'))
Schema = namedtuple('Schema', 'name')


class Schema(DjangoORM):

    def __init__(self, name):
        super().__init__()
        self.name = name


class Dataset(DjangoORM):

    def __init__(self, schema):
        super().__init__()
        self.schema = schema


class Data(DjangoORM):

    def __init__(self, dataset, field, value):
        super().__init__()
        self.dataset = dataset
        self.field = field
        self.value = value


def traverse_simple(d):
    iter_stack = [d]
    group_stack = []
    while len(iter_stack) > 0:
        print()
        iterable = iter_stack.pop()
        if len(group_stack) < 1:
            parent_name = "Root"
        else:
            parent_name = group_stack.pop()
        if isinstance(iterable, list):

            for el in iterable:
                if isinstance(el, dict) or isinstance(el, list):
                    iter_stack.append(el)
                    group_stack.append(parent_name)
                else:
                    print(f"Group={parent_name}", el)
        else:
            for k, v in iterable.items():
                if isinstance(v, dict) or isinstance(v, list):
                    iter_stack.append(v)
                    group_stack.append(k)
                else:
                    print(f"Group={parent_name}", v)


class SchemaNode:

    def __init__(self, d):
        self.name = d['name']
        self.children, self.fields = self.generate_graph(d)

    def generate_graph(self, d):
        children = []
        fields = {}
        for k in d:
            if not k.startswith('field') or k.endswith('Type'):
                continue
            field = d[k]
            field_type = d[k]['fieldType'].lower()
            if field_type == 'object' or field_type == 'list':
                children.append(SchemaNode(field))
                children[-1].parent = self
            else:
                fields[field['name']] = field["selectedFieldType"]
        return children, fields

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


class SchemaNode2:

    def __init__(self, d):
        self.name = d['name']
        self.field_type = d['fieldType'].upper() if 'fieldType' in d else 'object'.upper()
        self.children, self.fields = self.generate_graph(d)
        # for stuff that's tangentially related. nothing in here affects the
        # inner workings of SchemaNode.
        self.tangent = {}
        self.parent = None

    def generate_graph(self, d):
        children = []
        fields = {}
        for k in d:
            if not k.startswith('field') or k.endswith('Type'):
                continue
            field = d[k]
            field_type = d[k]['fieldType'].lower()

            if field_type == 'object' or field_type == 'list':
                children.append(SchemaNode2(field))
                children[-1].parent = self
            else:
                fields[field['name']] = field["selectedFieldType"]

        return children, fields

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


class DatasetNode:

    def __init__(self, d):

        self.name = d['name']
        self.data_type = d['fieldType'].upper() if 'fieldType' in d else 'object'.upper()
        self.children = self.generate_graph(d)

        # for stuff that's tangentially related. nothing in here affects the
        # inner workings of SchemaNode.
        self.tangent = {}
        self.parent = None

    def generate_graph(self, d):
        children = []
        for k in d:
            if not k.startswith('field') or k.endswith('Type'):
                continue
            field = d[k]
            children.append(DatasetNode(field))
            children[-1].parent = self

        return children

    def add_datum(self, datum):
        raise Exception('Not implemented!!!')
        field = datum.field
        fields = []
        while field.group is not None:
            fields.append(field)
            field = field.group
        fields = reversed(fields)
        i = 0
        stack = [self]
        while len(stack) > 0:
            node = stack.pop()
            i_prev = i
            for child in node.children:
                if len(stack) > 0 and child.name == field[i].name:
                    stack.append(node)
                    i += 1
                elif len(stack) == 0 and child.name == field[i].name:
                    pass

    @property
    def primitive_fields(self):
        for child in self.children:
            if child.data_type == FieldDataTypeChoices.OBJECT or child.data_type == FieldDataTypeChoices.LIST:
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


class FieldWrapper:

    def __init__(self, schema):
        self.schema = schema

    @property
    def name(self):
        return self.schema.name

    @property
    def data_type(self):
        return FieldDataTypeChoices.OBJECT


class Nein:
    pass


class ORMDatasetNode:

    def __init__(self, field):
        self.field = field
        self.children = []
        # for stuff that's tangentially related. nothing in here affects the
        # inner workings of SchemaNode.
        self.tangent = {}
        self.parent = None
        self.value = Nein

    def is_root(self):
        return self.parent is None

    @property
    def name(self):
        return self.field.name

    @property
    def data_type(self):
        return self.field.data_type

    @classmethod
    def tree_from_dataset(cls, dataset):
        root = cls.tree_from_schema(dataset.schema)
        data = Data.objects.all().filter(dataset=dataset)
        for datum in data:
            root.add_datum(datum)
        return root

    @classmethod
    def tree_from_schema(cls, schema, starting_point=None):
        if starting_point is not None:
            root = cls(starting_point.field)
            root.parent = starting_point.parent
            fields = list(Field.objects.all().filter(schema=schema, group=starting_point.field))
        else:
            root = cls(FieldWrapper(schema))
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
        while abs(i)-1 < len(fields):
            field = fields[i]
            if field != node.field:
                return None
            node = node.parent
            i -= 1

        return requested_node

    def find_nearest_list(self, node):

        while node is not None:
            if node.field.data_type == FieldDataTypeChoices.LIST.upper():
                return node
            node = node.parent
        return None

    def add_list_child(self, list_node):
        # subroot? yes subroot, for your subrooting needs. subtree is probably more accurate
        # but this sounds more consistent in my half-awake state.
        subroot = self.__class__.tree_from_schema(self.field.schema, list_node.children[0])
        list_node.children.append(subroot)
        return subroot

    def add_datum(self, datum):
        field = datum.field
        fields = []
        while field is not None:
            fields.append(field)
            field = field.group
        fields = list(reversed(fields))
        node = self.find_node_relative(fields)
        assert node.data_type == datum.field.data_type
        is_primitive = lambda dt: dt != FieldDataTypeChoices.OBJECT and dt != FieldDataTypeChoices.LIST
        if node is not None and is_primitive(datum.field.data_type):
            if node.value is Nein:
                node.value = datum.value
            else:
                list_node_field = self.find_nearest_list(node)
                assert list_node_field is not None
                new_list_node_field_el = self.add_list_child(list_node_field)
                node = self.find_node_relative(fields, starting_point=new_list_node_field_el)
                assert node is not None
                node.value = datum.value

    @property
    def primitive_fields(self):
        for child in self.children:
            if child.data_type == FieldDataTypeChoices.OBJECT or child.data_type == FieldDataTypeChoices.LIST:
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

    def to_json(self, compact=False):
        is_named = lambda parent: parent.data_type != FieldDataTypeChoices.LIST
        is_primitive = lambda t: t != FieldDataTypeChoices.LIST and t != FieldDataTypeChoices.OBJECT
        if compact:
            if self.parent is None:
                d = {}
            elif self.data_type == FieldDataTypeChoices.OBJECT and is_named(self.parent):
                d = {self.name: {}}
            elif self.data_type == FieldDataTypeChoices.OBJECT and not is_named(self.parent):
                d = {}
            elif self.data_type == FieldDataTypeChoices.LIST:
                d = {self.name: []}
            elif is_primitive(self.data_type) and self.parent.data_type == FieldDataTypeChoices.OBJECT:
                d = {self.name: self.value}
            elif is_primitive(self.data_type) and self.parent.data_type == FieldDataTypeChoices.LIST:
                d = self.value
            for child_node in self.children:
                if self.parent is None:
                    d.update(child_node.to_json(compact))
                elif self.data_type == FieldDataTypeChoices.OBJECT:
                    d.update(child_node.to_json(compact))
                elif self.data_type == FieldDataTypeChoices.LIST:
                    d[self.name].append(child_node.to_json(compact))
                else:
                    raise Exception(f'Type {self.data_type} should not have children')

        else:
            d = {'name': self.name, 'count': 0, 'fieldType': self.data_type}
            if self.value is not Nein:
                d['value'] = self.value

            for child_node in self.children:
                d[f'field{d["count"]}'] = child_node.to_json()
                d['count'] += 1
        return d



def traverse_schema_tree(d):
    tree = SchemaNode(d)
    for node in tree:
        for field in node.fields:
            print(f'{node.name}:\t\t\t {field}')


def traverse_dataset_tree(d):
    tree = DatasetNode(d)
    for node in tree:
        for field in node.primitive_fields:
            print(f'{node.name}:\t\t\t {field}')


if __name__ == '__main__':
    import os


    def simple():

        with open('./info.json', 'r') as f:
            d = json.load(f)
        traverse_simple(d)


    def tree_based():

        with open('./example_supply_chain_output.json', 'r') as f:
            d = json.load(f)
        traverse_schema_tree(d)


    def simulate_backend_schema_creation():

        with open('./example_supply_chain_output.json', 'r') as f:
            d = json.load(f)
        tree = SchemaNode(d)
        print(f"Creating schema {tree.name}")
        for i, node in enumerate(tree):
            if i > 0:
                print(f"Creating group field: {node.name} attached to"
                      f" {node.parent}")
            for field in node.fields:
                print(f"Creating primitive field: {field} attached to"
                      f" {node.name}")
            print()


    def simulate_backend_schema_creation2():

        with open('./example_supply_chain_output.json', 'r') as f:
            d = json.load(f)
        tree = SchemaNode2(d)
        print(f"Schema: {tree.name}")
        for i, node in enumerate(tree):
            if i > 0:
                print(f"Group field: {node.name} attached to"
                      f" {node.parent}")
            for field in node.fields:
                print(f"Primitive field: {field} attached to"
                      f" {node.name}")
            print()


    def simulate_bug():
        with open('./bug.json', 'r') as f:
            d = json.load(f)
        tree = SchemaNode2(d)
        print(f"Schema: {tree.name}")
        for i, node in enumerate(tree):
            if i > 0:
                print(f"Group field: {node.name} attached to"
                      f" {node.parent}")
            for field in node.fields:
                print(f"Primitive field: {field} attached to"
                      f" {node.name}")
            print()


    def simulate_dataset_creation():
        schema = Schema('supplychain')
        name = 'timelineEvents'
        data_type = FieldDataTypeChoices.LIST
        group = None

        field1 = Field(schema, name, data_type, group)

        name = 'Event'
        data_type = FieldDataTypeChoices.OBJECT
        group = field1

        field2 = Field(schema, name, data_type, group)

        name = 'eventName'
        data_type = FieldDataTypeChoices.TEXT
        group = field2

        field3 = Field(schema, name, data_type, group)

        name = 'timestamp'
        data_type = FieldDataTypeChoices.TEXT
        group = field2

        field4 = Field(schema, name, data_type, group)

        name = 'Title'
        data_type = FieldDataTypeChoices.TEXT

        field5 = Field(schema, name, data_type)

        name = 'Ingredients'
        data_type = FieldDataTypeChoices.LIST
        group = None

        field6 = Field(schema, name, data_type, group)

        name = 'Ingredient'
        data_type = FieldDataTypeChoices.TEXT
        group = field6

        field7 = Field(schema, name, data_type, group)

        name = 'type'
        data_type = FieldDataTypeChoices.TEXT
        group = None

        field8 = Field(schema, name, data_type, group)

        name = 'description'
        data_type = FieldDataTypeChoices.TEXT
        group = None

        field9 = Field(schema, name, data_type, group)

        name = 'manufacturer'
        data_type = FieldDataTypeChoices.TEXT
        group = None

        field10 = Field(schema, name, data_type, group)

        name = 'batchNumber'
        data_type = FieldDataTypeChoices.TEXT
        group = None

        field11 = Field(schema, name, data_type, group)

        name = 'countryOfOrigin'
        data_type = FieldDataTypeChoices.TEXT
        group = None

        field12 = Field(schema, name, data_type, group)

        name = 'expirationDate'
        data_type = FieldDataTypeChoices.TEXT
        group = None

        field13 = Field(schema, name, data_type, group)

        name = 'primaryImage'
        data_type = FieldDataTypeChoices.TEXT
        group = None

        field14 = Field(schema, name, data_type, group)

        name = 'secondaryImage'
        data_type = FieldDataTypeChoices.TEXT
        group = None

        field15 = Field(schema, name, data_type, group)

        name = 'secondaryImageTitle'
        data_type = FieldDataTypeChoices.TEXT
        group = None

        field16 = Field(schema, name, data_type, group)

        name = 'verifiedProperties'
        data_type = FieldDataTypeChoices.LIST
        group = None

        field17 = Field(schema, name, data_type, group)

        name = 'verifiedProperty'
        data_type = FieldDataTypeChoices.TEXT
        group = field17

        field18 = Field(schema, name, data_type, group)

        dataset = Dataset(schema=schema)

        Data(dataset, field18, "Gluten Free")
        Data(dataset, field18, "Vegetarian")
        Data(dataset, field18, "Trans-fat Free")
        Data(dataset, field18, "Halal")

        Data(dataset, field16, "Nutrition Facts")

        Data(dataset, field15,
             "https://lanier-example-bucket.s3-us-west-2.amazonaws.com/lentil-chips-nutrition-crop-rounded-corners.png")

        Data(dataset, field14, "https://lanier-example-bucket.s3-us-west-2.amazonaws.com/poppadoms-lentil-chips-crop-rounded-corners.png")

        Data(dataset, field13, "2022-10-15T12:00:00Z")

        Data(dataset, field12, "Malaysia")

        Data(dataset, field11, 1234)

        Data(dataset, field10, "Uncle Saba's")

        Data(dataset, field9, 'Healthy Lentil Chips with more protein')

        Data(dataset, field8, 'Food')

        event_name_datum = Data(dataset, field3, 'Processing')
        event_date_datum = Data(dataset, field4, '8/12/2020')

        event_name_datum = Data(dataset, field3, 'Shipped')
        event_date_datum = Data(dataset, field4, '8/13/2020')


        ingredient1 = Data(dataset, field7, "Lentil Chips")
        ingredient2 = Data(dataset, field7, "Vegetable Oil")
        ingredient3 = Data(dataset, field7, "Seasoning Powder")

        title_datum = Data(dataset, field5, "Uncle Saba's Poppadoms Original Lentil Chips")

        tree = ORMDatasetNode.tree_from_dataset(dataset)
        d = tree.to_json(True)
        from pprint import PrettyPrinter
        p = PrettyPrinter(indent=4)
        p.pprint(d)


    simulate_dataset_creation()
