import { fireEvent, screen, waitFor, within } from '@testing-library/react';

import { useUserSettings } from '@proton/account';
import { CryptoProxy } from '@proton/crypto';
import { API_CODES, API_KEY_SOURCE, CONTACT_CARD_TYPE, KEY_FLAG } from '@proton/shared/lib/constants';
import { parseToVCard } from '@proton/shared/lib/contacts/vcard';
import type { RequireSome, UserSettings } from '@proton/shared/lib/interfaces';
import type { VCardContact, VCardProperty } from '@proton/shared/lib/interfaces/contacts/VCard';
import { addApiMock } from '@proton/testing/lib/api';

import { clearAll, mockedCryptoApi, notificationManager, renderWithProviders } from '../tests/render';
import type { ContactEmailSettingsProps } from './ContactEmailSettingsModal';
import ContactEmailSettingsModal from './ContactEmailSettingsModal';

jest.mock('@proton/account/userSettings/hooks');

const mockUserSettings = ({ SupportPgpV6Keys }: { SupportPgpV6Keys: 1 | 0 }) => {
    jest.mocked(useUserSettings).mockReturnValue([{ Flags: { SupportPgpV6Keys } } as UserSettings, false, jest.fn()]);
};

describe('ContactEmailSettingsModal', () => {
    const props: ContactEmailSettingsProps = {
        contactID: 'ContactID',
        vCardContact: { fn: [] },
        emailProperty: {} as VCardProperty<string>,
        onClose: jest.fn(),
    };

    beforeEach(clearAll);

    afterEach(async () => {
        await CryptoProxy.releaseEndpoint();
    });

    it('should save a contact with updated email settings (no keys)', async () => {
        CryptoProxy.setEndpoint(mockedCryptoApi);
        mockUserSettings({ SupportPgpV6Keys: 0 });

        const vcard = `BEGIN:VCARD
VERSION:4.0
FN;PREF=1:J. Doe
UID:urn:uuid:4fbe8971-0bc3-424c-9c26-36c3e1eff6b1
ITEM1.EMAIL;PREF=1:jdoe@example.com
END:VCARD`;

        const vCardContact = parseToVCard(vcard) as RequireSome<VCardContact, 'email'>;

        const saveRequestSpy = jest.fn();

        addApiMock('core/v4/keys/all', () => {
            return { Address: { Keys: [] } };
        });
        addApiMock('contacts/v4/contacts', (args) => {
            saveRequestSpy(args.data);
            return { Responses: [{ Response: { Code: API_CODES.SINGLE_SUCCESS } }] };
        });
        addApiMock('contacts/v4/contacts/ContactID', (args) => {
            saveRequestSpy(args.data);
            return { Code: API_CODES.SINGLE_SUCCESS };
        });

        renderWithProviders(
            <ContactEmailSettingsModal
                open={true}
                {...props}
                vCardContact={vCardContact}
                emailProperty={vCardContact.email[0]}
            />
        );

        const showMoreButton = screen.getByRole('button', { name: 'Expand' });
        await waitFor(() => expect(showMoreButton).not.toBeDisabled());
        fireEvent.click(showMoreButton);

        const encryptToggle = document.getElementById('encrypt-toggle');
        expect(encryptToggle).toBeDisabled();

        const signSelect = screen.getByText("Use global default (Don't sign)", { exact: false });
        fireEvent.click(signSelect);
        const signOption = screen.getByTitle('Sign');
        fireEvent.click(signOption);

        const pgpSelect = screen.getByText('Use global default (PGP/MIME)', { exact: false });
        fireEvent.click(pgpSelect);
        const pgpInlineOption = screen.getByTitle('PGP/Inline');
        fireEvent.click(pgpInlineOption);

        const saveButton = screen.getByText('Save');
        fireEvent.click(saveButton);

        await waitFor(() => expect(notificationManager.createNotification).toHaveBeenCalled());

        const sentData = saveRequestSpy.mock.calls[0][0];
        const cards = sentData.Cards;

        const expectedEncryptedCard = `BEGIN:VCARD
VERSION:4.0
FN;PREF=1:J. Doe
UID:urn:uuid:4fbe8971-0bc3-424c-9c26-36c3e1eff6b1
ITEM1.EMAIL;PREF=1:jdoe@example.com
ITEM1.X-PM-MIMETYPE:text/plain
ITEM1.X-PM-SIGN:true
ITEM1.X-PM-SCHEME:pgp-inline
END:VCARD`.replaceAll('\n', '\r\n');

        const signedCardContent = cards.find(
            ({ Type }: { Type: CONTACT_CARD_TYPE }) => Type === CONTACT_CARD_TYPE.SIGNED
        ).Data;

        expect(signedCardContent).toBe(expectedEncryptedCard);
    });

    it('should not store X-PM-SIGN if global default signing setting is selected', async () => {
        CryptoProxy.setEndpoint(mockedCryptoApi);
        mockUserSettings({ SupportPgpV6Keys: 0 });

        const vcard = `BEGIN:VCARD
VERSION:4.0
FN;PREF=1:J. Doe
UID:urn:uuid:4fbe8971-0bc3-424c-9c26-36c3e1eff6b1
ITEM1.EMAIL;PREF=1:jdoe@example.com
ITEM1.X-PM-SIGN:true
END:VCARD`;

        const vCardContact = parseToVCard(vcard) as RequireSome<VCardContact, 'email'>;

        const saveRequestSpy = jest.fn();

        addApiMock('core/v4/keys/all', () => {
            return { Address: { Keys: [] } };
        });
        addApiMock('contacts/v4/contacts', (args) => {
            saveRequestSpy(args.data);
            return { Responses: [{ Response: { Code: API_CODES.SINGLE_SUCCESS } }] };
        });
        addApiMock('contacts/v4/contacts/ContactID', (args) => {
            saveRequestSpy(args.data);
            return { Code: API_CODES.SINGLE_SUCCESS };
        });

        renderWithProviders(
            <ContactEmailSettingsModal
                open={true}
                {...props}
                vCardContact={vCardContact}
                emailProperty={vCardContact.email[0]}
            />
        );

        const showMoreButton = screen.getByRole('button', { name: 'Expand' });
        await waitFor(() => expect(showMoreButton).not.toBeDisabled());
        fireEvent.click(showMoreButton);

        const signSelect = screen.getByText('Sign', { exact: true });
        fireEvent.click(signSelect);
        const signOption = screen.getByTitle("Use global default (Don't sign)");
        fireEvent.click(signOption);

        const saveButton = screen.getByText('Save');
        fireEvent.click(saveButton);

        await waitFor(() => expect(notificationManager.createNotification).toHaveBeenCalled());

        const sentData = saveRequestSpy.mock.calls[0][0];
        const cards = sentData.Cards;

        const expectedCard = `BEGIN:VCARD
VERSION:4.0
FN;PREF=1:J. Doe
UID:urn:uuid:4fbe8971-0bc3-424c-9c26-36c3e1eff6b1
ITEM1.EMAIL;PREF=1:jdoe@example.com
END:VCARD`.replaceAll('\n', '\r\n');

        const signedCardContent = cards.find(
            ({ Type }: { Type: CONTACT_CARD_TYPE }) => Type === CONTACT_CARD_TYPE.SIGNED
        ).Data;

        expect(signedCardContent).toBe(expectedCard);
    });

    it('should update the stored pinned key order when a different uploaded key is selected for sending', async () => {
        CryptoProxy.setEndpoint({
            ...mockedCryptoApi,
            importPublicKey: jest.fn().mockImplementation(async ({ binaryKey }) => ({
                getFingerprint: () => new TextDecoder().decode(binaryKey),
                getCreationTime: () => new Date(0),
                getExpirationTime: () => new Date(0),
                getAlgorithmInfo: () => ({ algorithm: 'eddsa', curve: 'curve25519' }),
                subkeys: [],
                getUserIDs: jest.fn().mockImplementation(() => ['<userid@userid.com>']),
                getVersion: () => 4,
            })),
            canKeyEncrypt: jest.fn().mockImplementation(() => true),
            exportPublicKey: jest.fn().mockImplementation(({ key }) => new TextEncoder().encode(key.getFingerprint())),
            isExpiredKey: jest.fn().mockImplementation(() => false),
            isRevokedKey: jest.fn().mockImplementation(() => false),
        });
        mockUserSettings({ SupportPgpV6Keys: 0 });

        const dummyKey1Base64 = btoa('dummy-pinned-key-1');
        const dummyKey2Base64 = btoa('dummy-pinned-key-2');
        const vcard = `BEGIN:VCARD
VERSION:4.0
FN;PREF=1:pinned
UID:proton-web-b2dc0409-262d-96db-8925-3ee4f0030fd8
ITEM1.EMAIL;PREF=1:pinned1@test.com
ITEM1.KEY;PREF=1:data:application/pgp-keys;base64,${dummyKey1Base64}
ITEM1.KEY;PREF=2:data:application/pgp-keys;base64,${dummyKey2Base64}
ITEM1.X-PM-ENCRYPT:true
ITEM1.X-PM-SIGN:true
END:VCARD`;

        const vCardContact = parseToVCard(vcard) as RequireSome<VCardContact, 'email'>;

        const saveRequestSpy = jest.fn();

        addApiMock('core/v4/keys/all', () => {
            return { Address: { Keys: [] } };
        });
        addApiMock('contacts/v4/contacts', (args) => {
            saveRequestSpy(args.data);
            return { Responses: [{ Response: { Code: API_CODES.SINGLE_SUCCESS } }] };
        });
        addApiMock('contacts/v4/contacts/ContactID', (args) => {
            saveRequestSpy(args.data);
            return { Code: API_CODES.SINGLE_SUCCESS };
        });

        renderWithProviders(
            <ContactEmailSettingsModal
                open={true}
                {...props}
                vCardContact={vCardContact}
                emailProperty={vCardContact.email[0]}
            />
        );

        const showMoreButton = screen.getByRole('button', { name: 'Expand' });

        await waitFor(() => expect(showMoreButton).not.toBeDisabled());
        fireEvent.click(showMoreButton);

        const contactKeysTable = await screen.findByTestId('contact-keys-table', undefined, { timeout: 5000 });
        const contactKeysTableRows = await within(contactKeysTable).findAllByRole('row');
        expect(contactKeysTableRows).toHaveLength(2);
        // test primary key row
        await within(contactKeysTableRows[0]).findByText('dummy-pinned-key-1'); // fingerprint
        await within(contactKeysTableRows[0]).findByTestId('primary-key-label');
        // test other key row
        await within(contactKeysTableRows[1]).findByText('dummy-pinned-key-2'); // fingerprint
        expect(within(contactKeysTableRows[1]).queryByTestId('primary-key-label')).toBeNull();

        // mark second key as primary
        const dropdownButton = within(contactKeysTableRows[1]).getByTitle('Open actions dropdown');
        fireEvent.click(dropdownButton);
        const useForSendingButton = screen.getByText('Use for sending');
        fireEvent.click(useForSendingButton);

        const saveButton = screen.getByText('Save');
        fireEvent.click(saveButton);

        await waitFor(() => expect(notificationManager.createNotification).toHaveBeenCalled());

        const sentData = saveRequestSpy.mock.calls[0][0];
        const cards = sentData.Cards;

        const signedCardContent = cards.find(
            ({ Type }: { Type: CONTACT_CARD_TYPE }) => Type === CONTACT_CARD_TYPE.SIGNED
        ).Data;

        // confirm that pinned key order has been changed
        expect(signedCardContent.includes(`ITEM1.KEY;PREF=1:data:application/pgp-keys;base64,${dummyKey2Base64}`)).toBe(
            true
        );
        expect(signedCardContent.includes(`ITEM1.KEY;PREF=2:data:application/pgp-keys;base64,${dummyKey1Base64}`)).toBe(
            true
        );
        expect(signedCardContent.includes('ITEM1.X-PM-ENCRYPT')).toBe(true);
        expect(signedCardContent.includes('ITEM1.X-PM-SIGN')).toBe(true);
    });

    it('should warn if encryption is enabled and uploaded keys are not valid for sending', async () => {
        CryptoProxy.setEndpoint({
            ...mockedCryptoApi,
            importPublicKey: jest.fn().mockImplementation(async () => ({
                getFingerprint: () => `abcdef`,
                getCreationTime: () => new Date(0),
                getExpirationTime: () => new Date(0),
                getAlgorithmInfo: () => ({ algorithm: 'eddsa', curve: 'curve25519' }),
                subkeys: [],
                getUserIDs: jest.fn().mockImplementation(() => ['<userid@userid.com>']),
                getVersion: () => 4,
            })),
            canKeyEncrypt: jest.fn().mockImplementation(() => false),
            exportPublicKey: jest.fn().mockImplementation(() => new Uint8Array()),
            isExpiredKey: jest.fn().mockImplementation(() => true),
            isRevokedKey: jest.fn().mockImplementation(() => false),
        });
        mockUserSettings({ SupportPgpV6Keys: 0 });

        const vcard = `BEGIN:VCARD
VERSION:4.0
FN;PREF=1:expired
UID:proton-web-b2dc0409-262d-96db-8925-3ee4f0030fd8
ITEM1.EMAIL;PREF=1:expired@test.com
ITEM1.KEY;PREF=1:data:application/pgp-keys;base64,xjMEYS376BYJKwYBBAHaRw8BA
 QdAm9ZJKSCnCg28vJ/1Iegycsiq9wKxFP5/BMDeP51C/jbNGmV4cGlyZWQgPGV4cGlyZWRAdGVz
 dC5jb20+wpIEEBYKACMFAmEt++gFCQAAAPoECwkHCAMVCAoEFgACAQIZAQIbAwIeAQAhCRDs7cn
 9e8csRhYhBP/xHanO8KRS6sPFiOztyf17xyxGhYIBANpMcbjGa3w3qPzWDfb3b/TgfbJuYFQ49Y
 ik/Zd/ZZQZAP42rtyxbSz/XfKkNdcJPbZ+MQa2nalOZ6+uXm9ScCQtBc44BGEt++gSCisGAQQBl
 1UBBQEBB0Dj+ZNzODXqLeZchFOVE4E87HD8QsoSI60bDkpklgK3eQMBCAfCfgQYFggADwUCYS37
 6AUJAAAA+gIbDAAhCRDs7cn9e8csRhYhBP/xHanO8KRS6sPFiOztyf17xyxGbyIA/2Jz6p/6WBo
 yh279kjiKpX8NWde/2/O7M7W7deYulO4oAQDWtYZNTw1OTYfYI2PBcs1kMbB3hhBr1VEG0pLvtz
 xoAA==
ITEM1.X-PM-ENCRYPT:true
ITEM1.X-PM-SIGN:true
END:VCARD`;

        const vCardContact = parseToVCard(vcard) as RequireSome<VCardContact, 'email'>;

        const saveRequestSpy = jest.fn();

        addApiMock('core/v4/keys/all', () => {
            return { Address: { Keys: [] } };
        });
        addApiMock('contacts/v4/contacts', (args) => {
            saveRequestSpy(args.data);
            return { Responses: [{ Response: { Code: API_CODES.SINGLE_SUCCESS } }] };
        });
        addApiMock('contacts/v4/contacts/ContactID', (args) => {
            saveRequestSpy(args.data);
            return { Code: API_CODES.SINGLE_SUCCESS };
        });

        renderWithProviders(
            <ContactEmailSettingsModal
                open={true}
                {...props}
                vCardContact={vCardContact}
                emailProperty={vCardContact.email[0]}
            />
        );

        const showMoreButton = screen.getByRole('button', { name: 'Expand' });

        await waitFor(() => expect(showMoreButton).not.toBeDisabled());
        fireEvent.click(showMoreButton);

        await waitFor(() => {
            const keyFingerprint = screen.getByText('abcdef');
            return expect(keyFingerprint).toBeVisible();
        });

        const warningInvalidKey = screen.getByText(/None of the uploaded keys are valid for encryption/);
        expect(warningInvalidKey).toBeVisible();

        const encryptToggleLabel = screen.getByText('Encrypt emails');
        fireEvent.click(encryptToggleLabel);

        expect(warningInvalidKey).not.toBeVisible();

        const saveButton = screen.getByText('Save');
        fireEvent.click(saveButton);

        await waitFor(() => expect(notificationManager.createNotification).toHaveBeenCalled());

        const sentData = saveRequestSpy.mock.calls[0][0];
        const cards = sentData.Cards;

        const signedCardContent = cards.find(
            ({ Type }: { Type: CONTACT_CARD_TYPE }) => Type === CONTACT_CARD_TYPE.SIGNED
        ).Data;

        expect(signedCardContent.includes('ITEM1.X-PM-ENCRYPT:false')).toBe(true);
    });

    it('should enable encryption by default if WKD keys are found', async () => {
        CryptoProxy.setEndpoint({
            ...mockedCryptoApi,
            importPublicKey: jest.fn().mockImplementation(async () => ({
                getFingerprint: () => `abcdef`,
                getCreationTime: () => new Date(0),
                getExpirationTime: () => new Date(0),
                getAlgorithmInfo: () => ({ algorithm: 'eddsa', curve: 'curve25519' }),
                subkeys: [],
                getUserIDs: jest.fn().mockImplementation(() => ['<jdoe@example.com>']),
                getVersion: () => 4,
            })),
            canKeyEncrypt: jest.fn().mockImplementation(() => true),
            exportPublicKey: jest.fn().mockImplementation(() => new Uint8Array()),
            isExpiredKey: jest.fn().mockImplementation(() => false),
            isRevokedKey: jest.fn().mockImplementation(() => false),
        });
        mockUserSettings({ SupportPgpV6Keys: 0 });

        const armoredPublicKey = `-----BEGIN PGP PUBLIC KEY BLOCK-----

xjMEYRaiLRYJKwYBBAHaRw8BAQdAMrsrfniSJuxOLn+Q3VKP0WWqgizG4VOF
6t0HZYx8mSnNEHRlc3QgPHRlc3RAYS5pdD7CjAQQFgoAHQUCYRaiLQQLCQcI
AxUICgQWAAIBAhkBAhsDAh4BACEJEKaNwv/NOLSZFiEEnJT1OMsrVBCZa+wE
po3C/804tJnYOAD/YR2og60sJ2VVhPwYRL258dYIHnJXI2dDXB+m76GK9x4A
/imlPnTOgIJAV1xOqkvO96QcbawjKgvH829zxN9DZEgMzjgEYRaiLRIKKwYB
BAGXVQEFAQEHQN5UswYds0RWr4I7xNKNK+fOn+o9pYkkYzJwCbqxCsBwAwEI
B8J4BBgWCAAJBQJhFqItAhsMACEJEKaNwv/NOLSZFiEEnJT1OMsrVBCZa+wE
po3C/804tJkeKgEA0ruKx9rcMTi4LxfYgijjPrI+GgrfegfREt/YN2KQ75gA
/Rs9S+8arbQVoniq7izz3uisWxfjMup+IVEC5uqMld8L
=8+ep
-----END PGP PUBLIC KEY BLOCK-----`;

        const vcard = `BEGIN:VCARD
VERSION:4.0
FN;PREF=1:J. Doe
UID:urn:uuid:4fbe8971-0bc3-424c-9c26-36c3e1eff6b1
ITEM1.EMAIL;PREF=1:jdoe@example.com
ITEM1.X-PM-ENCRYPT:true
END:VCARD`;

        const vCardContact = parseToVCard(vcard) as RequireSome<VCardContact, 'email'>;

        const saveRequestSpy = jest.fn();

        addApiMock('core/v4/keys/all', () => {
            return {
                Address: { Keys: [] },
                Unverified: {
                    Keys: [{ Flags: 3, PublicKey: armoredPublicKey }],
                },
            };
        });
        addApiMock('contacts/v4/contacts', (args) => {
            saveRequestSpy(args.data);
            return { Responses: [{ Response: { Code: API_CODES.SINGLE_SUCCESS } }] };
        });
        addApiMock('contacts/v4/contacts/ContactID', (args) => {
            saveRequestSpy(args.data);
            return { Code: API_CODES.SINGLE_SUCCESS };
        });

        renderWithProviders(
            <ContactEmailSettingsModal
                open={true}
                {...props}
                vCardContact={vCardContact}
                emailProperty={vCardContact.email[0]}
            />
        );

        const showMoreButton = screen.getByRole('button', { name: 'Expand' });
        await waitFor(() => expect(showMoreButton).not.toBeDisabled());
        fireEvent.click(showMoreButton);

        const encryptToggle = document.getElementById('encrypt-toggle');
        expect(encryptToggle).not.toBeDisabled();
        expect(encryptToggle).toBeChecked();

        const signSelectDropdown = document.getElementById('sign-select');
        expect(signSelectDropdown).toBeDisabled();
        signSelectDropdown?.innerHTML.includes('Sign');

        const saveButton = screen.getByText('Save');
        fireEvent.click(saveButton);

        await waitFor(() => expect(notificationManager.createNotification).toHaveBeenCalled());

        const sentData = saveRequestSpy.mock.calls[0][0];
        const cards = sentData.Cards;

        const expectedEncryptedCard = `BEGIN:VCARD
VERSION:4.0
FN;PREF=1:J. Doe
UID:urn:uuid:4fbe8971-0bc3-424c-9c26-36c3e1eff6b1
ITEM1.EMAIL;PREF=1:jdoe@example.com
ITEM1.X-PM-ENCRYPT-UNTRUSTED:true
ITEM1.X-PM-SIGN:true
END:VCARD`.replaceAll('\n', '\r\n');

        const signedCardContent = cards.find(
            ({ Type }: { Type: CONTACT_CARD_TYPE }) => Type === CONTACT_CARD_TYPE.SIGNED
        ).Data;

        expect(signedCardContent).toBe(expectedEncryptedCard);
    });

    it('should warn if encryption is enabled and WKD keys are not valid for sending', async () => {
        CryptoProxy.setEndpoint({
            ...mockedCryptoApi,
            importPublicKey: jest.fn().mockImplementation(async () => ({
                getFingerprint: () => `abcdef`,
                getCreationTime: () => new Date(0),
                getExpirationTime: () => new Date(0),
                getAlgorithmInfo: () => ({ algorithm: 'eddsa', curve: 'curve25519' }),
                subkeys: [],
                getUserIDs: jest.fn().mockImplementation(() => ['<userid@userid.com>']),
                getVersion: () => 4,
            })),
            canKeyEncrypt: jest.fn().mockImplementation(() => false),
            exportPublicKey: jest.fn().mockImplementation(() => new Uint8Array()),
            isExpiredKey: jest.fn().mockImplementation(() => true),
            isRevokedKey: jest.fn().mockImplementation(() => false),
        });
        mockUserSettings({ SupportPgpV6Keys: 0 });

        const armoredPublicKey = `-----BEGIN PGP PUBLIC KEY BLOCK-----

xjMEYS376BYJKwYBBAHaRw8BAQdAm9ZJKSCnCg28vJ/1Iegycsiq9wKxFP5/
BMDeP51C/jbNGmV4cGlyZWQgPGV4cGlyZWRAdGVzdC5jb20+wpIEEBYKACMF
AmEt++gFCQAAAPoECwkHCAMVCAoEFgACAQIZAQIbAwIeAQAhCRDs7cn9e8cs
RhYhBP/xHanO8KRS6sPFiOztyf17xyxGhYIBANpMcbjGa3w3qPzWDfb3b/Tg
fbJuYFQ49Yik/Zd/ZZQZAP42rtyxbSz/XfKkNdcJPbZ+MQa2nalOZ6+uXm9S
cCQtBc44BGEt++gSCisGAQQBl1UBBQEBB0Dj+ZNzODXqLeZchFOVE4E87HD8
QsoSI60bDkpklgK3eQMBCAfCfgQYFggADwUCYS376AUJAAAA+gIbDAAhCRDs
7cn9e8csRhYhBP/xHanO8KRS6sPFiOztyf17xyxGbyIA/2Jz6p/6WBoyh279
kjiKpX8NWde/2/O7M7W7deYulO4oAQDWtYZNTw1OTYfYI2PBcs1kMbB3hhBr
1VEG0pLvtzxoAA==
=456g
-----END PGP PUBLIC KEY BLOCK-----`;

        const vcard = `BEGIN:VCARD
VERSION:4.0
FN;PREF=1:J. Doe
UID:urn:uuid:4fbe8971-0bc3-424c-9c26-36c3e1eff6b1
ITEM1.EMAIL;PREF=1:jdoe@example.com
END:VCARD`;

        const vCardContact = parseToVCard(vcard) as RequireSome<VCardContact, 'email'>;

        const saveRequestSpy = jest.fn();

        addApiMock('core/v4/keys/all', () => {
            return {
                Address: { Keys: [] },
                Unverified: { Keys: [{ Flags: 3, PublicKey: armoredPublicKey }] },
            };
        });
        addApiMock('contacts/v4/contacts', (args) => {
            saveRequestSpy(args.data);
            return { Responses: [{ Response: { Code: API_CODES.SINGLE_SUCCESS } }] };
        });
        addApiMock('contacts/v4/contacts/ContactID', (args) => {
            saveRequestSpy(args.data);
            return { Code: API_CODES.SINGLE_SUCCESS };
        });

        renderWithProviders(
            <ContactEmailSettingsModal
                open={true}
                {...props}
                vCardContact={vCardContact}
                emailProperty={vCardContact.email[0]}
            />
        );

        const showMoreButton = screen.getByRole('button', { name: 'Expand' });

        await waitFor(() => expect(showMoreButton).not.toBeDisabled());
        fireEvent.click(showMoreButton);

        await waitFor(() => {
            const keyFingerprint = screen.getByText('abcdef');
            return expect(keyFingerprint).toBeVisible();
        });

        const warningInvalidKey = screen.getByText(/None of the uploaded keys are valid for encryption/);
        expect(warningInvalidKey).toBeVisible();

        const encryptToggleLabel = screen.getByText('Encrypt emails');
        fireEvent.click(encryptToggleLabel);

        expect(warningInvalidKey).not.toBeVisible();

        const saveButton = screen.getByText('Save');
        fireEvent.click(saveButton);

        await waitFor(() => expect(notificationManager.createNotification).toHaveBeenCalled());

        const sentData = saveRequestSpy.mock.calls[0][0];
        const cards = sentData.Cards;

        const signedCardContent = cards.find(
            ({ Type }: { Type: CONTACT_CARD_TYPE }) => Type === CONTACT_CARD_TYPE.SIGNED
        ).Data;

        expect(signedCardContent.includes('ITEM1.X-PM-ENCRYPT-UNTRUSTED:false')).toBe(true);
    });

    it('should indicate that end-to-end encryption is disabled for internal addresses whose keys have e2ee-disabled flags', async () => {
        CryptoProxy.setEndpoint({
            ...mockedCryptoApi,
            importPublicKey: jest.fn().mockImplementation(async () => ({
                getFingerprint: () => `abcdef`,
                getCreationTime: () => new Date(0),
                getExpirationTime: () => new Date(0),
                getAlgorithmInfo: () => ({ algorithm: 'eddsa', curve: 'curve25519' }),
                subkeys: [],
                getUserIDs: jest.fn().mockImplementation(() => ['<userid@userid.com>']),
                getVersion: () => 4,
            })),
            canKeyEncrypt: jest.fn().mockImplementation(() => true),
            exportPublicKey: jest.fn().mockImplementation(() => new Uint8Array()),
            isExpiredKey: jest.fn().mockImplementation(() => false),
            isRevokedKey: jest.fn().mockImplementation(() => false),
        });
        mockUserSettings({ SupportPgpV6Keys: 0 });

        const vcard = `BEGIN:VCARD
VERSION:4.0
FN;PREF=1:J. Doe
UID:urn:uuid:4fbe8971-0bc3-424c-9c26-36c3e1eff6b1
ITEM1.EMAIL;PREF=1:jdoe@proton.me
END:VCARD`;

        const vCardContact = parseToVCard(vcard) as RequireSome<VCardContact, 'email'>;

        const saveRequestSpy = jest.fn();

        addApiMock('core/v4/keys/all', () => {
            return {
                Address: {
                    Keys: [
                        {
                            PublicKey: 'mocked armored key',
                            Flags: KEY_FLAG.FLAG_EMAIL_NO_ENCRYPT | KEY_FLAG.FLAG_NOT_COMPROMISED,
                        },
                    ],
                },
                ProtonMX: true, // internal address
            };
        });
        addApiMock('contacts/v4/contacts', (args) => {
            saveRequestSpy(args.data);
            return { Responses: [{ Response: { Code: API_CODES.SINGLE_SUCCESS } }] };
        });
        addApiMock('contacts/v4/contacts/ContactID', (args) => {
            saveRequestSpy(args.data);
            return { Code: API_CODES.SINGLE_SUCCESS };
        });

        renderWithProviders(
            <ContactEmailSettingsModal
                open={true}
                {...props}
                vCardContact={vCardContact}
                emailProperty={vCardContact.email[0]}
            />
        );

        const showMoreButton = screen.getByRole('button', { name: 'Expand' });

        await waitFor(() => expect(showMoreButton).not.toBeDisabled());
        fireEvent.click(showMoreButton);

        await waitFor(() => {
            const keyFingerprint = screen.getByText('abcdef');
            return expect(keyFingerprint).toBeVisible();
        });

        const infoEncryptionDisabled = screen.getByText(/The owner of this address has disabled end-to-end encryption/);
        expect(infoEncryptionDisabled).toBeVisible();

        expect(screen.queryByText('Encrypt emails')).toBeNull();
        expect(screen.queryByText('Sign emails')).toBeNull();
        expect(screen.queryByText('Upload keys')).toBeNull();

        const dropdownButton = screen.getByTitle('Open actions dropdown');
        fireEvent.click(dropdownButton);
        const trustKeyButton = screen.getByText('Trust');
        fireEvent.click(trustKeyButton);

        const saveButton = screen.getByText('Save');
        fireEvent.click(saveButton);

        await waitFor(() => expect(notificationManager.createNotification).toHaveBeenCalled());

        const sentData = saveRequestSpy.mock.calls[0][0];
        const cards = sentData.Cards;

        const signedCardContent = cards.find(
            ({ Type }: { Type: CONTACT_CARD_TYPE }) => Type === CONTACT_CARD_TYPE.SIGNED
        ).Data;
        expect(signedCardContent.includes('ITEM1.KEY;PREF=1:data:application/pgp-keys')).toBe(true);
        expect(signedCardContent.includes('ITEM1.X-PM-ENCRYPT')).toBe(false);
        expect(signedCardContent.includes('ITEM1.X-PM-SIGN')).toBe(false);
    });

    it('should display WKD keys but not internal address keys for external account with internal address keys', async () => {
        CryptoProxy.setEndpoint({
            ...mockedCryptoApi,
            importPublicKey: jest.fn().mockImplementation(async ({ armoredKey }) => ({
                getFingerprint: () => armoredKey,
                getCreationTime: () => new Date(0),
                getExpirationTime: () => new Date(0),
                getAlgorithmInfo: () => ({ algorithm: 'eddsa', curve: 'curve25519' }),
                subkeys: [],
                getUserIDs: jest.fn().mockImplementation(() => ['<userid@userid.com>']),
                getVersion: () => 4,
            })),
            canKeyEncrypt: jest.fn().mockImplementation(() => true),
            exportPublicKey: jest.fn().mockImplementation(() => new Uint8Array()),
            isExpiredKey: jest.fn().mockImplementation(() => false),
            isRevokedKey: jest.fn().mockImplementation(() => false),
        });
        mockUserSettings({ SupportPgpV6Keys: 0 });

        const vcard = `BEGIN:VCARD
VERSION:4.0
FN;PREF=1:J. Doe
UID:urn:uuid:4fbe8971-0bc3-424c-9c26-36c3e1eff6b1
ITEM1.EMAIL;PREF=1:jdoe@example.com
END:VCARD`;

        const vCardContact = parseToVCard(vcard) as RequireSome<VCardContact, 'email'>;

        const saveRequestSpy = jest.fn();

        addApiMock('core/v4/keys/all', () => {
            return {
                Address: {
                    Keys: [
                        {
                            PublicKey: 'internal mocked armored key',
                            Flags: KEY_FLAG.FLAG_EMAIL_NO_ENCRYPT | KEY_FLAG.FLAG_NOT_COMPROMISED,
                        },
                    ],
                },
                Unverified: {
                    Keys: [{ PublicKey: 'wkd mocked armored key', Flags: KEY_FLAG.FLAG_NOT_COMPROMISED }],
                },
                ProtonMX: false, // external account
            };
        });
        addApiMock('contacts/v4/contacts', (args) => {
            saveRequestSpy(args.data);
            return { Responses: [{ Response: { Code: API_CODES.SINGLE_SUCCESS } }] };
        });
        addApiMock('contacts/v4/contacts/ContactID', (args) => {
            saveRequestSpy(args.data);
            return { Code: API_CODES.SINGLE_SUCCESS };
        });

        renderWithProviders(
            <ContactEmailSettingsModal
                open={true}
                {...props}
                vCardContact={vCardContact}
                emailProperty={vCardContact.email[0]}
            />
        );

        const showMoreButton = screen.getByRole('button', { name: 'Expand' });

        await waitFor(() => expect(showMoreButton).not.toBeDisabled());
        fireEvent.click(showMoreButton);

        await waitFor(() => {
            const internalAddressKeyFingerprint = screen.queryByText('internal mocked armored key');
            return expect(internalAddressKeyFingerprint).toBeNull();
        });

        await waitFor(() => {
            const wkdKeyFingerprint = screen.getByText('wkd mocked armored key');
            return expect(wkdKeyFingerprint).toBeVisible();
        });

        const infoEncryptionDisabled = screen.queryByText(
            /The owner of this address has disabled end-to-end encryption/
        );
        expect(infoEncryptionDisabled).toBeNull(); // only shown to internal accounts

        // Ensure the UI matches that of external recipients with WKD keys:
        // - encryption should be enabled by default, and toggable
        // - key uploads are not permitted
        // - key pinning works stores the X-PM-ENCRYPT flag
        const encryptToggle = document.getElementById('encrypt-toggle');
        expect(encryptToggle).not.toBeDisabled();
        expect(encryptToggle).toBeChecked();

        const signSelectDropdown = document.getElementById('sign-select');
        expect(signSelectDropdown).toBeDisabled();
        signSelectDropdown?.innerHTML.includes('Sign');

        expect(screen.queryByText('Upload keys')).toBeNull();

        const dropdownButton = screen.getByTitle('Open actions dropdown');
        fireEvent.click(dropdownButton);
        const trustKeyButton = screen.getByText('Trust');
        fireEvent.click(trustKeyButton);

        const saveButton = screen.getByText('Save');
        fireEvent.click(saveButton);

        await waitFor(() => expect(notificationManager.createNotification).toHaveBeenCalled());

        const sentData = saveRequestSpy.mock.calls[0][0];
        const cards = sentData.Cards;

        const signedCardContent = cards.find(
            ({ Type }: { Type: CONTACT_CARD_TYPE }) => Type === CONTACT_CARD_TYPE.SIGNED
        ).Data;

        expect(signedCardContent.includes('ITEM1.KEY;PREF=1:data:application/pgp-keys')).toBe(true);
        expect(signedCardContent.includes('ITEM1.X-PM-ENCRYPT:true')).toBe(true);
        expect(signedCardContent.includes('ITEM1.X-PM-SIGN:true')).toBe(true);
    });

    describe('contact key status label and key pinning option', () => {
        const vcard = `BEGIN:VCARD
VERSION:4.0
FN;PREF=1:J. Doe
UID:urn:uuid:4fbe8971-0bc3-424c-9c26-36c3e1eff6b1
ITEM1.EMAIL;PREF=1:jdoe@example.com
END:VCARD`;

        beforeEach(() =>
            CryptoProxy.setEndpoint({
                ...mockedCryptoApi,
                importPublicKey: jest.fn().mockImplementation(async ({ armoredKey }) => ({
                    getFingerprint: () => armoredKey,
                    getCreationTime: () => new Date(0),
                    getExpirationTime: () => new Date(0),
                    getAlgorithmInfo: () => ({ algorithm: 'eddsa', curve: 'curve25519' }),
                    subkeys: [],
                    getUserIDs: jest.fn().mockImplementation(() => ['<userid@userid.com>']),
                    getVersion: () => (armoredKey.includes('v6') ? 6 : 4),
                })),
                canKeyEncrypt: jest.fn().mockImplementation(() => true),
                exportPublicKey: jest.fn().mockImplementation(() => new Uint8Array()),
                isExpiredKey: jest.fn().mockImplementation(() => false),
                isRevokedKey: jest.fn().mockImplementation(() => false),
            })
        );

        it('should display no origin label for internal keys', async () => {
            mockUserSettings({ SupportPgpV6Keys: 0 });
            const vCardContact = parseToVCard(vcard) as RequireSome<VCardContact, 'email'>;

            addApiMock('core/v4/keys/all', () => ({
                Address: {
                    Keys: [
                        {
                            PublicKey: 'internally mocked armored key',
                            Flags: KEY_FLAG.FLAG_NOT_COMPROMISED | KEY_FLAG.FLAG_NOT_OBSOLETE,
                        },
                    ],
                },
                ProtonMX: true, // internal address
            }));

            renderWithProviders(
                <ContactEmailSettingsModal
                    open={true}
                    {...props}
                    vCardContact={vCardContact}
                    emailProperty={vCardContact.email[0]}
                />
            );

            const showMoreButton = screen.getByRole('button', { name: 'Expand' });
            await waitFor(() => expect(showMoreButton).not.toBeDisabled());
            fireEvent.click(showMoreButton);

            await waitFor(() => {
                const wkdKeyFingerprint = screen.getByText('internally mocked armored key');
                return expect(wkdKeyFingerprint).toBeVisible();
            });

            await waitFor(() => {
                const primaryLabel = screen.getByTestId('primary-key-label');
                return expect(primaryLabel).toBeVisible();
            });

            expect(screen.queryByTestId('wkd-origin-label')).toBeNull();
            expect(screen.queryByTestId('koo-origin-label')).toBeNull();
        });

        it('internal contact with v6 address keys: should display primary label for one primary key only, and allow pinning it based on user settings', async () => {
            const vCardContact = parseToVCard(vcard) as RequireSome<VCardContact, 'email'>;

            addApiMock('core/v4/keys/all', () => ({
                Address: {
                    Keys: [
                        {
                            PublicKey: 'internally mocked armored key v4',
                            Flags: KEY_FLAG.FLAG_NOT_COMPROMISED | KEY_FLAG.FLAG_NOT_OBSOLETE,
                            Primary: 1,
                        },
                        {
                            PublicKey: 'internally mocked armored key v6',
                            Flags: KEY_FLAG.FLAG_NOT_COMPROMISED | KEY_FLAG.FLAG_NOT_OBSOLETE,
                            Primary: 1,
                        },
                    ],
                },
                ProtonMX: true, // internal address
            }));

            const renderAndTest = async (withV6Support: boolean) => {
                mockUserSettings({ SupportPgpV6Keys: withV6Support ? 1 : 0 });

                const { unmount } = renderWithProviders(
                    <ContactEmailSettingsModal
                        open={true}
                        {...props}
                        vCardContact={vCardContact}
                        emailProperty={vCardContact.email[0]}
                    />
                );

                const showMoreButton = screen.getByRole('button', { name: 'Expand' });
                await waitFor(() => expect(showMoreButton).not.toBeDisabled());
                fireEvent.click(showMoreButton);

                const table = await screen.findByTestId('contact-keys-table');
                const rows = await within(table).findAllByRole('row');
                expect(rows.length).toBe(2);

                const expectedRowPrimaryKeyV6 = rows[withV6Support ? 0 : 1];
                const expectedRowPrimaryKeyV4 = rows[withV6Support ? 1 : 0];

                const v6KeyFingerprint = await within(expectedRowPrimaryKeyV6).findByText(
                    'internally mocked armored key v6'
                );
                expect(v6KeyFingerprint).toBeVisible();

                if (withV6Support) {
                    // primary label should only be displayed for the first primary key listed
                    const primaryLabel = await within(expectedRowPrimaryKeyV6).findByTestId('primary-key-label');
                    expect(primaryLabel).toBeVisible();
                    expect(within(expectedRowPrimaryKeyV4).queryByTestId('primary-key-label')).toBeNull();
                    // the v6 can only be trusted if user settings declare support for it
                    expect(within(rows[0]).getByTitle('Open actions dropdown')).toBeVisible();
                } else {
                    const primaryLabel = await within(expectedRowPrimaryKeyV4).findByTestId('primary-key-label');
                    expect(primaryLabel).toBeVisible();
                    expect(within(expectedRowPrimaryKeyV6).queryByTestId('primary-key-label')).toBeNull();

                    expect(within(expectedRowPrimaryKeyV6).queryByTitle('Open actions dropdown')).toBeNull();
                }

                const v4KeyFingerprint = await within(expectedRowPrimaryKeyV4).findByText(
                    'internally mocked armored key v4'
                );
                expect(v4KeyFingerprint).toBeVisible();
                expect(within(expectedRowPrimaryKeyV4).getByTitle('Open actions dropdown')).toBeVisible(); // can trust a v4 key

                unmount();
            };
            await renderAndTest(false);
            await renderAndTest(true);
        });

        it('should display WKD label for WKD keys, and allow pinning a v6 WKD key based on user settings', async () => {
            const vCardContact = parseToVCard(vcard) as RequireSome<VCardContact, 'email'>;

            addApiMock('core/v4/keys/all', () => ({
                Address: {
                    Keys: [],
                },
                Unverified: {
                    Keys: [
                        {
                            PublicKey: 'externally fetched mocked armored v6 key',
                            Flags: KEY_FLAG.FLAG_NOT_COMPROMISED | KEY_FLAG.FLAG_NOT_OBSOLETE,
                            Source: API_KEY_SOURCE.WKD,
                        },
                    ],
                },
                ProtonMX: false, // external account
            }));

            const renderAndTest = async (withV6Support: boolean) => {
                mockUserSettings({ SupportPgpV6Keys: withV6Support ? 1 : 0 });

                const { unmount } = renderWithProviders(
                    <ContactEmailSettingsModal
                        open={true}
                        {...props}
                        vCardContact={vCardContact}
                        emailProperty={vCardContact.email[0]}
                    />
                );

                const showMoreButton = screen.getByRole('button', { name: 'Expand' });

                await waitFor(() => expect(showMoreButton).not.toBeDisabled());
                fireEvent.click(showMoreButton);

                await waitFor(() => {
                    const primaryLabel = screen.getByTestId('primary-key-label');
                    expect(primaryLabel).toBeVisible();
                    const wkdOriginLabel = screen.getByTestId('wkd-origin-label');
                    return expect(wkdOriginLabel).toBeVisible();
                });

                expect(screen.queryByTestId('koo-origin-label')).toBeNull();

                if (withV6Support) {
                    // cannot trust a v6 key unless user settings declare support for it
                    expect(screen.getByTitle('Open actions dropdown')).toBeVisible();
                } else {
                    expect(screen.queryByTitle('Open actions dropdown')).toBeNull();
                }
                unmount();
            };

            await renderAndTest(false);
            await renderAndTest(true);
        });

        it('should display KOO label for KOO keys, and allow pinning a v6 KOO key based on user settings', async () => {
            const vCardContact = parseToVCard(vcard) as RequireSome<VCardContact, 'email'>;

            addApiMock('core/v4/keys/all', () => ({
                Address: {
                    Keys: [],
                },
                Unverified: {
                    Keys: [
                        {
                            PublicKey: 'externally fetched mocked armored v6 key',
                            Flags: KEY_FLAG.FLAG_NOT_COMPROMISED | KEY_FLAG.FLAG_NOT_OBSOLETE,
                            Source: API_KEY_SOURCE.KOO,
                        },
                    ],
                },
                ProtonMX: false, // external account
            }));

            const renderAndTest = async (withV6Support: boolean) => {
                mockUserSettings({ SupportPgpV6Keys: withV6Support ? 1 : 0 });
                const { unmount } = renderWithProviders(
                    <ContactEmailSettingsModal
                        open={true}
                        {...props}
                        vCardContact={vCardContact}
                        emailProperty={vCardContact.email[0]}
                    />
                );

                const showMoreButton = screen.getByRole('button', { name: 'Expand' });
                await waitFor(() => expect(showMoreButton).not.toBeDisabled());
                fireEvent.click(showMoreButton);

                await waitFor(() => {
                    const primaryLabel = screen.getByTestId('primary-key-label');
                    expect(primaryLabel).toBeVisible();
                    const kooOriginLabel = screen.getByTestId('koo-origin-label');
                    return expect(kooOriginLabel).toBeVisible();
                });

                expect(screen.queryByTestId('wkd-origin-label')).toBeNull();

                if (withV6Support) {
                    // cannot trust a v6 key unless user settings declare support for it
                    expect(screen.getByTitle('Open actions dropdown')).toBeVisible();
                } else {
                    expect(screen.queryByTitle('Open actions dropdown')).toBeNull();
                }
                unmount();
            };

            await renderAndTest(false);
            await renderAndTest(true);
        });
    });
});
