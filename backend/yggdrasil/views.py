from django.conf import settings
import traceback
# third party
from django.http import FileResponse
from rest_framework import generics
from rest_framework import status
from rest_framework.permissions import BasePermission
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import Schema, Field, ShareGroup, Dataset, Data, FieldDataTypeChoices, DatasetWatchTypeChoices
from .ygg import SchemaNode, ORMDatasetNode, submit_aggregated_data
from .serializers import DatasetsListSerializer, DataPeakListSerializer
from pdp2.pdp2 import Pdp2Cfg, Pdp2Op
import pdp2.pdp2 as django_pdp2
from pdp2.models import JSONStorage, AggregatedStorage
from .upload_handler import (get_upload_progress,
                             AMOUNT_UP_KEY,
                             UP_PROGRESS_KEY,
                             OWNER_ID_KEY,
                             NUM_PASSES)

logger = settings.LOGGER


def get_formatted_data(dataset_id):
    dataset = Dataset.objects.all().get(id=dataset_id)
    d = ORMDatasetNode.tree_from_dataset(dataset, is_file_remotely_mapped=True).to_json()
    if dataset.share_group.everyone:
        d['shared_with'] = 'everyone'
    else:
        d['shared_with'] = 'self'
    return d


def construct_dataset(dataset):
    def is_root_field_in_d(field, d):
        while field.group is not None:
            field = field.group
        for field_d_i in d.values():
            if field.name == field_d_i['name']:
                return True
        return False

    def new_branch(datum):
        field_stack = [datum.field]
        tmp_i = None
        while len(field_stack) > 0:
            field = field_stack.pop()
            if tmp_i is None:
                tmp_i = {'name': field.name, 'fieldType': field.data_type}
            elif True:
                tmp_i = {'name': field.name, 'fieldType': field.data_type, 'field1': tmp_i, 'count': 1}
            if datum.field == field:
                tmp_i['value'] = datum.value
            if field.group is not None:
                field_stack.append(field.group)
        return tmp_i

    def get_paths(field, d):
        keys = []
        fields = []
        while field.group is not None:
            fields.append(field)
        i = -1
        while abs(i) - 1 < len(fields):
            len_keys_before = len(keys)
            for key, field_d_i in d:
                if 'field' not in key or 'fieldType' in key:
                    continue
                field = fields[i]
                field_name_d_i = field_d_i['name']
                if field_name_d_i == field.name:
                    keys.append(key)
                    d = d[key]
                    i -= 1
            # additional keys could not be found so we return what we
            # found so far
            if len_keys_before == len(keys):
                return keys, fields

        return keys, fields

    def update_branch(d, datum, fields, keys_path):
        field = datum.field
        d = {}
        i = 0
        # Going in the reverse direction in case we need to find the first case
        # of a list type
        for field in fields:
            pass

    data = Data.objects.all().filter(dataset=dataset)
    d = {'name': dataset.schema.name}
    for datum in data:
        keys_path, fields = get_paths(datum.field, d)
        if len(keys_path) > 0:
            update_branch(d, datum, fields, keys_path)
        else:
            d_i = new_branch(datum)


def reconstruct_schema(schema, dataset=None):
    fields = Field.objects.all().filter(schema=schema)
    d = {'name': schema.name}
    group_stack = [(d, None)]
    # Todo this method requires multiple passes to create so, we should
    #  look here if we are finding performance issues
    while len(group_stack) > 0:
        d_i, group = group_stack.pop()
        i = 0
        for field in fields:
            if field.group != group:
                continue
            i += 1
            data_type = field.data_type.lower()
            field_name = 'field' + str(i)
            d_i[field_name] = {'name': field.name, 'fieldType': data_type.upper()}
            if dataset is not None:
                data = Data.objects.all().filter(dataset=dataset,
                                                 field=field)
                if data_type != FieldDataTypeChoices.OBJECT or data_type != FieldDataTypeChoices.LIST:
                    d_i['value'] = data.first().value
            if data_type == 'object' or data_type == 'list':
                group_stack.append((d_i[field_name], field))
        d_i['count'] = i
    return d


class SchemaView(generics.GenericAPIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        schemas = Schema.objects.all().filter(id=kwargs['schema_id'])
        if schemas.count() < 1:
            return Response({'detail': "schema not found"})
        schema = schemas.first()
        d = reconstruct_schema(schema)

        return Response(d, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        schema_tree = SchemaNode(request.data)
        sg = ShareGroup.objects.create(owner=request.user,
                                       everyone=True)
        schema = Schema.objects.create(share_group=sg,
                                       name=schema_tree.name,
                                       reusable=True)
        for i, node in enumerate(schema_tree):
            if i > 0:
                print(f"Creating group field: {node.name} attached to"
                      f" {node.parent}")
                d = {}
                d['schema'] = schema
                if node.parent is not None and node.parent.name != schema_tree.name:
                    d['group'] = node.parent.tangent['orm_field']
                d['data_type'] = node.field_type.upper()
                d['name'] = node.name
                group_field = Field.objects.create(**d)
                node.tangent['orm_field'] = group_field
            for node_field in node.fields:

                print(f"Creating primitive field: {node_field} attachcd ced to"
                      f" {node.name}")

                d = {}
                d['schema'] = schema
                # TODO this needs to be handled inside NodeSchema; this is ugly
                d['data_type'] = node_field['selectedFieldType'].upper()
                d['name'] = node_field.name
                if node.name != schema_tree.name:
                    d['group'] = node.tangent['orm_field']
                primitive_field = Field.objects.create(**d)
            print()
        return Response({}, status=status.HTTP_200_OK)


class SchemasView(generics.ListAPIView):
    permission_classes = (IsAuthenticated,)

    def list(self, request, *args, **kwargs):
        l = []
        for schema in Schema.objects.all():
            share_group = schema.share_group
            if share_group.owner == request.user or share_group.everyone:
                l.append({'name': schema.name, 'id': schema.id})
        return Response({'schemas': l}, status=status.HTTP_200_OK)


class HasAccessToDataset(BasePermission):

    def has_permission(self, request, view):
        if request.method.upper() == 'POST':
            return True
        dataset_id = view.kwargs.get('dataset_id', None)
        dataset = Dataset.objects.all().get(id=dataset_id)
        owner = dataset.share_group.owner
        if owner == request.user:
            return True
        if request.method.upper() == 'GET' and dataset.share_group.everyone:
            return True
        return False


def submit_to_pdp2_watches(request, dataset, cfg):
    if dataset.watched_by is not None:
        if dataset.watched_by == DatasetWatchTypeChoices.PDP2:
            return submit_dataset(request, dataset, cfg)


def submit_dataset(request, updated_dataset, new_cfg):
    pdp2_sub = django_pdp2.get_active_subscription(user=request.user)

    if pdp2_sub is None:
        raise django_pdp2.NoSubscriptionFound(request.user)
    cfg = django_pdp2.get_cfg(updated_dataset, new_cfg)

    submit_aggregated_data(cfg, updated_dataset, pdp2_sub, request.user)


def append_tangents_to_tree(schema, tree):
    for i, node in enumerate(tree):
        for child in node.children:
            if node.name == tree.name:
                field = Field.objects.all().filter(name=child.name,
                                                   schema=schema)
                child.tangent['orm_field'] = field.first()
            else:
                field = Field.objects.all().filter(name=child.name,
                                                   schema=schema,
                                                   group=node.tangent['orm_field'])
                child.tangent['orm_field'] = field.first()


def get_most_recent_txn_for_watched_dataset(dataset):
    jss = JSONStorage.objects.all().filter(dataset=dataset).order_by('-created_on')
    if jss.count() > 0:
        og_txn = jss.first().txn
    else:
        ass = AggregatedStorage.objects.all().filter(dataset=dataset).order_by('-created_on')
        if ass.count() > 0:
            og_txn = ass.first().txn
        else:
            og_txn = None
    return og_txn


class DatasetView(generics.GenericAPIView):
    permission_classes = (IsAuthenticated & HasAccessToDataset,)

    def delete(self, request, dataset_id, *args, **kwargs):
        dataset = Dataset.objects.all().get(id=dataset_id)
        dataset.delete()
        return Response({}, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        try:
            tree = SchemaNode(request.data)

            sg = ShareGroup.objects.create(owner=request.user,
                                           active=True,
                                           everyone=tree.shared_with)

            schema = Schema.objects.all().get(id=tree.id)

            dataset = Dataset.objects.create(schema=schema,
                                             share_group=sg,
                                             watched_by=tree.data_watch.name)

            append_tangents_to_tree(schema, tree)

            for i, node in enumerate(tree):
                for node_field in node.fields:
                    if node.name == tree.name:
                        fields = Field.objects.all().filter(name=node_field.name,
                                                            schema=schema)

                    else:
                        fields = Field.objects.all().filter(name=node_field.name,
                                                            schema=schema,
                                                            group=node.tangent['orm_field'])

                    field = fields.first()
                    if field.data_type.upper() == FieldDataTypeChoices.VIDEO.upper() \
                            or field.data_type.upper() == FieldDataTypeChoices.IMAGE.upper() \
                            or field.data_type.upper() == FieldDataTypeChoices.FILE.upper():
                        file = node_field['value']
                        data = Data.objects.create(dataset=dataset,
                                                   field=field,
                                                   data_file=file)
                    else:
                        data = Data.objects.create(dataset=dataset,
                                                   field=field,
                                                   value=node_field['value'])

            if dataset.watched_by is not None:
                submit_to_pdp2_watches(request, dataset, tree.cfg)

            return Response({}, status=status.HTTP_200_OK)
        except:
            logger.error(traceback.format_exc())
            raise

    def put(self, request, dataset_id, *args, **kwargs):

        tree = SchemaNode(request.data)
        dataset = Dataset.objects.all().get(id=dataset_id)
        schema = dataset.schema

        # since there isn't a real concrete definition as to who (other than PAIPass can
        # track these transactions, we'll check first if they differ
        # then if the difference is they go from None to something
        # else, we change it to that something else; otherwise
        # we do nothing if it changes back to None
        if tree.data_watch.name is not None and dataset.watched_by is None:
            dataset.watched_by = tree.data_watch.name

        sg = dataset.share_group
        sg.everyone = tree.shared_with
        sg.save()

        append_tangents_to_tree(schema, tree)

        for i, node in enumerate(tree):
            for node_field in node.fields:
                if node.name == tree.name:
                    fields = Field.objects.all().filter(name=node_field.name,
                                                        schema=schema)

                else:
                    fields = Field.objects.all().filter(name=node_field.name,
                                                        schema=schema,
                                                        group=node.tangent['orm_field'])

                field = fields.first()
                if node_field.get('data_id', None) is None:
                    Data.objects.create(dataset=dataset,
                                        field=field,
                                        value=node_field['value'])
                else:
                    data = Data.objects.all().get(id=node_field['data_id'])
                    if 'value' in node_field and node_field['value'] != data.value:
                        data.value = node_field['value']
                        data.save()

        if dataset.watched_by is not None:
            submit_to_pdp2_watches(request, dataset, tree.cfg)

        return Response({}, status=status.HTTP_200_OK)

    def get(self, request, dataset_id, *args, **kwargs):
        d = get_formatted_data(dataset_id)

        return Response(d, status=status.HTTP_200_OK)


class ResultsPagination(PageNumberPagination):
    page_size = 10
    page_query_param = 'page'
    page_size_query_param = 'perPage'
    max_page_size = 100


def get_datasets_qs(request):
    share_groups = ShareGroup.objects.all().filter(owner=request.user)

    qs = []
    for share_group in share_groups:
        # .order_by(self.request.query_params['orderBy']) \
        new_qs = Dataset \
            .objects \
            .all() \
            .order_by('-date_created') \
            .filter(share_group=share_group)
        if new_qs.count() < 1:
            continue
        if len(qs) < 1:
            qs = new_qs
        else:
            qs = qs | new_qs

    if 'dataset_id' in request.query_params:
        qs = qs.filter(dataset_id__icontains=request.query_params['dataset_id'])
    return qs


def get_data(dataset, field_name, data_value=None):
    field_qs = Field.objects.all().filter(schema=dataset.schema,
                                          name=field_name)
    if field_qs.count() < 1:
        return None
    field = field_qs.first()
    if data_value is not None:
        dqs = Data.objects.all().filter(dataset=dataset,
                                        field=field,
                                        value=data_value)
    else:
        dqs = Data.objects.all().filter(dataset=dataset,
                                        field=field)
    return dqs


class DatasetsView(generics.ListAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = DatasetsListSerializer
    pagination_class = ResultsPagination
    general_filters = {'orderDir', 'perPage', 'orderBy', 'page', 'dataset_id', 'distinct', 'shared_with'}

    paginate_by = 10

    def get_queryset(self):
        distinct_field_name = self.request.query_params.get('distinct', None)
        distinct_values = None
        if distinct_field_name is not None:
            distinct_values = set()

        qs = get_datasets_qs(self.request)

        gf = self.__class__.general_filters
        qp = self.request.query_params
        qpks = set(qp)
        diff = qpks.difference(gf)
        perPage = max(self.__class__.paginate_by, int(self.request.query_params.get('perPage', 0)))
        max_items = perPage * 2
        start = int(self.request.query_params.get('page', 0)) * perPage

        if len(diff) > 0:
            new_qs = []
            the_great_filtering = dict(filter(lambda item: item[0] in diff, qp.items()))
            for dataset in qs:
                if not dataset.share_group.active:
                    continue
                for key, value in the_great_filtering.items():
                    dqs = get_data(dataset, key, value)
                    if dqs is None:
                        continue

                    if dqs.count() > 0:
                        if distinct_values is None:
                            new_qs.append(dataset)
                        else:
                            dqs = get_data(dataset, distinct_field_name)
                            if dqs is not None and dqs.count() > 0:
                                distinct_value = dqs.first().value
                                if isinstance(distinct_value, str):
                                    distinct_value = distinct_value.lower()
                                if distinct_value not in distinct_values:
                                    # this is where we add it to our queryset
                                    new_qs.append(dataset)
                                    distinct_values.add(distinct_value)

                    if len(new_qs) - start >= max_items:
                        break
            qs = new_qs

        # make sure there is not empty data inside
        # todo: make data entry s.t. this doens't happen
        actual_qs = []
        for q_i in qs:
            if not q_i.share_group.active:
                continue
            d = Data.objects.all().filter(dataset=q_i)
            if d.count() > 0:
                actual_qs.append(q_i)
            if len(actual_qs) - start >= max_items:
                break
        return actual_qs


class DataBundleView(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        if request.query_params.get('id', None) is None:
            return Response({'detail': 'no ids provided'}, status=status.HTTP_400_BAD_REQUEST)
        d = {}
        ids = request.query_params.getlist('id')
        for id in ids:
            data = get_formatted_data(id)
            d[id] = data
            dataset = Dataset.objects.all().get(id=id)
            if dataset.watched_by is not None:
                txn = get_most_recent_txn_for_watched_dataset(dataset)
                if txn is not None:
                    txid = txn.pdp2_op_return_txid
                else:
                    txid = None
            else:
                txid = None
            d[id]['txid'] = txid
        return Response(d, status=status.HTTP_200_OK)


class DataPeakView(DatasetsView):
    permission_classes = (IsAuthenticated,)
    serializer_class = DataPeakListSerializer
    pagination_class = ResultsPagination
    general_filters = {'orderDir', 'perPage', 'orderBy', 'page', 'dataset_id'}

    paginate_by = 10

    def get_queryset(self):
        pass


class DataView(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, data_id, *args, **kwargs):
        data_qs = Data.objects.all().filter(id=data_id)
        if data_qs.count() < 1:
            return Response({}, status=status.HTTP_404_NOT_FOUND)
        data = data_qs.first()
        user_owns_data = data.dataset.share_group.owner == request.user
        data_is_public = data.dataset.share_group.everyone
        if not (user_owns_data or data_is_public):
            return Response({'detail': 'This user does not own the data and the data is not publicly shared'})
        response = FileResponse(data.data_file, status=status.HTTP_200_OK)
        return response


class UploadProgressListView(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, dataset_id, *args, **kwargs):
        if dataset_id is None:
            return Response({'detail': f'File uploads key: "{UP_PROGRESS_KEY}" not found in data.'},
                            status=status.HTTP_400_BAD_REQUEST)
        upload_progress = get_upload_progress(dataset_id)
        if upload_progress is None:
            return Response({'detail': f'No files with upload progress found.'},
                            status=status.HTTP_404_NOT_FOUND)
        owner_id = upload_progress[OWNER_ID_KEY]
        if owner_id != request.user.id:
            return Response({'detail': f'{request.user.email} does not own this upload'},
                            status=status.HTTP_403_FORBIDDEN)
        return Response(upload_progress, status=status.HTTP_200_OK)
