from django.core.files.uploadhandler import (FileUploadHandler,
                                             StopFutureHandlers)
from django.core.cache import cache
from io import BytesIO
import tempfile
import os
import uuid
from django.conf import settings
from django.core.files.uploadedfile import (
    InMemoryUploadedFile, UploadedFile,
)

UP_PROGRESS_KEY = 'upload_progress'
# Probably deprecated at this point.
CONTENT_LEN_KEY = 'content_length'
# This is the number of expected passes that the read() function will go
# through before it is sent to s3.
# As a refresher, because I surely won't remember this by the time I revisit this,
# there are, at the current date of 20201023, two passes that occur.
# Firstly, the data is copied "temporarily" (hopefully) from the frontend to the backend instance.
# Secondly, the data is copied from the backend instance to s3.
# The frontend is expected to use this to divide the number of bytes processed,
# by the number of number of times it SHOULD BE processed to give progress updates to the user.
NUM_PASSES = 2
AMOUNT_UP_KEY = 'amount_uploaded'
OWNER_ID_KEY = 'owner_id'
FILE_ID_KEY = 'file_uuid'


def get_upload_progress(dataset_id):
    files_upload_progress = cache.get(dataset_id)

    return files_upload_progress


class UploadProgressHandler(FileUploadHandler):

    def __init__(self, request=None):
        super().__init__(request)
        self.is_inited = False
        self.content_length = None
        self.cache_key = None
        self.file_progress_key = None

    def new_file(self, field_name, file_name, content_type, content_length, charset, content_type_extra):
        if 'r*' in field_name:

            self.cache_key = field_name.split('r*')[1]
            self.file_progress_key = field_name

            if content_length is None:
                content_length = self.content_length

            initial_prog = {CONTENT_LEN_KEY: content_length,
                            AMOUNT_UP_KEY: 0,
                            'num_passes': NUM_PASSES,
                            }
            upload_progress = cache.get(self.cache_key)
            if upload_progress is None:
                upload_progress = {}
            upload_progress[field_name] = initial_prog

            if OWNER_ID_KEY not in upload_progress:
                upload_progress[OWNER_ID_KEY] = self.request.user.id
            cache.set(self.cache_key, upload_progress)

    def handle_raw_input(self, input_data, META, content_length, boundary, encoding):
        self.content_length = content_length

    def receive_data_chunk(self, raw_data, start):

        if self.cache_key is not None and self.file_progress_key is not None:
            upload_progress = cache.get(self.cache_key)
            upload_progress[self.file_progress_key][AMOUNT_UP_KEY] += self.chunk_size
            cache.set(self.cache_key, upload_progress)

        return raw_data

    def file_complete(self, file_size):
        return None

    def upload_complete(self):
        # What happens when we return None?
        # The handler should return an UploadedFile object that will be stored in request.FILES.
        # Handlers may also return None to indicate that the UploadedFile object should come from
        # subsequent upload handlers.
        pass



class TemporaryUploadedFileWithTrackedProgress(UploadedFile):
    def __init__(self, name, content_type, size, charset, content_type_extra=None, cache_key=None,
                 file_progress_key=None):
        self.cache_key = cache_key
        self.file_progress_key = file_progress_key
        _, ext = os.path.splitext(name)
        file = tempfile.NamedTemporaryFile(suffix='.upload' + ext, dir=settings.FILE_UPLOAD_TEMP_DIR)
        super().__init__(file, name, content_type, size, charset, content_type_extra)
        self.file.name = name

    def read(self, amount, **kwargs):
        # Boto3 uses 1024*1024 for their md5 process in botocore.handlers -> def _calculate_md5_from_file.
        # The division by 100 is to be at least a couple orders of magnitude off.
        # Moreover, it seems like it is read in sizes of 8192 as shown in the constructor of
        # HTTPConnection (which is found in http/client.py.
        if 0 < amount < (1024 * 1024 / 100) and self.cache_key is not None and self.file_progress_key is not None:
            upload_progress = cache.get(self.cache_key)
            upload_progress[self.file_progress_key][AMOUNT_UP_KEY] += amount
            cache.set(self.cache_key, upload_progress)

        return super().read(amount, **kwargs)

    def temporary_file_path(self):
        """Return the full path of this file."""
        return self.file.name

    def close(self):
        try:
            return self.file.close()
        except FileNotFoundError:
            # The file was moved or deleted before the tempfile could unlink
            # it. Still sets self.file.close_called and calls
            # self.file.file.close() before the exception.
            pass


class TemporaryFileWithTrackedProgressUploadHandler(FileUploadHandler):
    """
    Upload handler that streams data into a temporary file.
    """

    def __init__(self, request=None):
        super().__init__(request)
        self.cache_key = None
        # if request is not None and 'tree' in request.POST:
        #    self.cache_key = json.loads(request.POST['tree'])['uuid']

    def new_file(self, field_name, file_name, content_type, content_length, charset, content_type_extra):
        """
        Create the file object to append to as data is coming in.
        """
        super().new_file(field_name, file_name, content_type, content_length, charset, content_type_extra)
        if 'r*' in field_name:
            self.cache_key = field_name.split('r*')[1]
        self.file = TemporaryUploadedFileWithTrackedProgress(self.file_name,
                                                             self.content_type,
                                                             0,
                                                             self.charset,
                                                             self.content_type_extra,
                                                             cache_key=self.cache_key,
                                                             # self.field_name is generated by the parent class
                                                             file_progress_key=self.field_name)

    def receive_data_chunk(self, raw_data, start):
        self.file.write(raw_data)

    def file_complete(self, file_size):
        self.file.seek(0)
        self.file.size = file_size
        return self.file


class MemoryFileUploadHandler(FileUploadHandler):
    """
    File upload handler to stream uploads into memory (used for small files).
    """

    def handle_raw_input(self, input_data, META, content_length, boundary, encoding=None):
        """
        Use the content_length to signal whether or not this handler should be
        used.
        """
        # Check the content-length header to see if we should
        # If the post is too large, we cannot use the Memory handler.
        self.activated = content_length <= settings.FILE_UPLOAD_MAX_MEMORY_SIZE

    def new_file(self, *args, **kwargs):
        super().new_file(*args, **kwargs)
        if self.activated:
            self.file = BytesIO()
            raise StopFutureHandlers()

    def receive_data_chunk(self, raw_data, start):
        """Add the data to the BytesIO file."""
        if self.activated:
            self.file.write(raw_data)
        else:
            return raw_data

    def file_complete(self, file_size):
        """Return a file object if this handler is activated."""
        if not self.activated:
            return

        self.file.seek(0)
        return InMemoryUploadedFile(
            file=self.file,
            field_name=self.field_name,
            name=self.file_name,
            content_type=self.content_type,
            size=file_size,
            charset=self.charset,
            content_type_extra=self.content_type_extra
        )
