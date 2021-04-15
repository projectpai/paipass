import binascii

import base58
import coincurve
import ecies


class PrivateKey:
    '''Basically a wrapper for coincurve's PrivateKey for better
    ease of use.'''

    def __init__(self, wif_private_key):
        self.wif_private_key = wif_private_key

        if wif_private_key.lower().startswith('9'):
            self.testnet = True
            self.compressed = False
        elif wif_private_key.lower().startswith('c'):
            self.testnet = True
            self.compressed = True
        elif wif_private_key.lower().startswith('5'):
            self.testnet = False
            self.compressed = False
        elif wif_private_key.lower().startswith('k'):
            self.testnet = False
            self.compressed = True
        elif wif_private_key.lower().startswith('l'):
            self.testnet = False
            self.compressed = True
        else:
            raise ValueError(f'Private key address prefix is not supported'
                             f' {wif_private_key}')

        self.cc_private_key = self.convert_to_coincurve_private_key(self.wif_private_key)

    def convert_to_coincurve_private_key(cls, wif_private_key):

        decoded = base58.b58decode(wif_private_key)

        private_key_full = binascii.hexlify(decoded)
        # 2 - remove address prefix
        # 8 - remove address suffix
        private_key = private_key_full[2:-8].decode('utf-8')

        pk = coincurve.PrivateKey.from_hex(private_key)

        return pk


if __name__ == '__main__':
    def atmpt1():
        '''This doesn't work'''
        address = '2NBSUn97nXu8GDvwsmipV4kuuRoCUrBq8Lu'
        wif_private_key = 'cPhnVqon8qro8WmFJ5ma24Lrp59XnudnhywdkPcERw4xM9Mhbr1e'
        hex_private_key = 'EF3F51A18ECD207FD7099FD6FF6C2367C014F53A9F41CEAD5F1CC9A4911BF7ECFC01B0918959'
        pk = PrivateKey(wif_private_key)
        # pk = ecies.utils.generate_key()

        '''
        encrypted = ecies.encrypt(address.encode(), b'this is a test') # This should clearly have been the public key
        decrypted = ecies.decrypt(priv_key.encode(), encrypted)
        
        print('encrypted', encrypted)
        print('decrypted', decrypted)
        '''


    def atmpt2():
        ''' solution that works...'''
        from bit import Key
        wif_private_key = 'cPhnVqon8qro8WmFJ5ma24Lrp59XnudnhywdkPcERw4xM9Mhbr1e'
        private_key = Key(wif_private_key)
        encrypted = ecies.encrypt(private_key.public_key, b'this is a test')
        decrypted = ecies.decrypt(private_key._pk.secret, encrypted)

        print('encrypted', encrypted)
        print('decrypted', decrypted)


    def attmpt3():
        from bit import Key
        pub_key = 'a914a3b89512784d065575358de68fc952336372b36187'
        priv_key = 'cUm3jRhPByM75Brt2uzTKKnn8xH1eKdh2c1p4t36E4XQYMMFm418'
        pub_key_addr = '2N8AuFZDWpkxTR4CTtEmWED4REYUEzaKafb'
        key = Key(priv_key)
        pk = key.public_key
        print(pk)


    def attmpt4_alg(pub_key, data):
        i_pk = int(pub_key, 16)
        num_bytes = i_pk.bit_length() // 8 + 1
        # Only works with big endian despite sys.byteorder returning 'little'
        # Maybe something to do with how bitcoin does it.
        endianness = 'big'
        b_pk = i_pk.to_bytes(num_bytes, endianness)
        encrypted = ecies.encrypt(b_pk, data)

        return encrypted


    def attmpt4_even_pub_key():
        from bit import Key

        pub_key = '02b01692bb20206f03417f9cfd3dfc51e545feb1d7ff5f5f6648a9747988009e8a'
        priv_key = 'cSetqogg21eiTnhuZ79ru4LBSPiGyfZPDiXy5EWgE1LYhu5NzoAL'
        pub_key_addr = '2NCrvwAoL7fc8p5bVaqkbXWUmDStvTUBZAb'
        data = b'We have had success with the even public key'

        encrypted = attmpt4_alg(pub_key, data)

        sk = Key(priv_key)

        decrypted = ecies.decrypt(sk._pk.secret, encrypted)

        assert data == decrypted
        print(decrypted)


    def attmpt4_odd_pub_key():
        from bit import Key

        pub_key = '035178ab67471945e966833ffe3c4f6ad8fbac6c2f79c1df80a6ab9686dfb70fde'
        priv_key = 'cSQh7Ve5YbKptjECW6gMtdhX9v4N1AiN7ypZ22RWBSN31RpkcAsY'
        pub_key_addr = '2N3qAgYYwv1mJGksATbqzfsJ5LoAxcoCR9J'
        data = b'We have had success with the odd public key'

        encrypted = attmpt4_alg(pub_key, data)

        sk = Key(priv_key)

        decrypted = ecies.decrypt(sk._pk.secret, encrypted)

        assert data == decrypted
        print(decrypted)


    def attmpt4():
        attmpt4_even_pub_key()
        attmpt4_odd_pub_key()


    def attmpt4_even_pub_key_old():
        from bit import Key
        from coincurve import PublicKey
        pub_key = '02b01692bb20206f03417f9cfd3dfc51e545feb1d7ff5f5f6648a9747988009e8a'
        priv_key = 'cSetqogg21eiTnhuZ79ru4LBSPiGyfZPDiXy5EWgE1LYhu5NzoAL'
        pub_key_addr = '2NCrvwAoL7fc8p5bVaqkbXWUmDStvTUBZAb'
        pk = PublicKey(int(pub_key, 16).to_bytes(33, 'big'))
        sk = Key(priv_key)
        i_pk = int(pub_key, 16)
        num_bytes = i_pk.bit_length() // 8 + 1
        # Only works with big endian despite sys.byteorder returning 'little'
        # Maybe something to do with how bitcoin does it.
        endianness = 'big'
        b_pk = i_pk.to_bytes(num_bytes, endianness)
        encrypted = ecies.encrypt(b_pk, b'We have had success with the an even public key')
        decrypted = ecies.decrypt(sk._pk.secret, encrypted)
        print(decrypted)

    def attmpt_paicoin():
        pub_key_addr ='MnqtQVYSkEinTukeaz2zQdJbo4fivzJMip'
        pub_key = '02b01692bb20206f03417f9cfd3dfc51e545feb1d7ff5f5f6648a9747988009e8a'
        pub_key = '031a5808d3d801fb08e43209566803e950e2bad98b1bec39ac0f736799b1b1533a'
        priv_key = 'aZiUxsYszMG6REqQ8kLiaTU9TNLoyMwPuX7q24YmbF5AA7kDw784'

        i_pk = int(pub_key, 16)
        num_bytes = i_pk.bit_length() // 8 + 1
        # Only works with big endian despite sys.byteorder returning 'little'
        # Maybe something to do with how bitcoin does it.
        endianness = 'big'
        b_pk = i_pk.to_bytes(num_bytes, endianness)
        encrypted = ecies.encrypt(b_pk, b'We have had success with the an even public key')
        decrypted = ecies.decrypt(sk._pk.secret, encrypted)



    attmpt_paicoin()
