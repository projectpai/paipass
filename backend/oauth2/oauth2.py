
def scope_expression_to_symbols(scope):
    rw_permission, namespace, attr = scope.lower().split('.')
    return rw_permission, namespace, attr

