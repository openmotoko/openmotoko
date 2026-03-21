import {
	createCipheriv,
	createDecipheriv,
	createHash,
	createPrivateKey,
	createPublicKey,
	diffieHellman,
	generateKeyPairSync,
	randomBytes,
} from 'node:crypto'

const IV_LENGTH = 12 // AES-GCM recommended
const KEY_LENGTH = 32 // AES-256

export interface EncryptedMessage {
	ciphertext: string
	iv: string
	authTag: string
	senderPublicKey: string
}

export class E2EEncryption {
	/**
	 * Generate an X25519 key pair for key exchange.
	 * Returns hex-encoded public and private keys.
	 */
	generateKeyPair(): { publicKey: string; privateKey: string } {
		const { publicKey, privateKey } = generateKeyPairSync('x25519', {
			publicKeyEncoding: { type: 'spki', format: 'der' },
			privateKeyEncoding: { type: 'pkcs8', format: 'der' },
		})

		return {
			publicKey: Buffer.from(publicKey).toString('hex'),
			privateKey: Buffer.from(privateKey).toString('hex'),
		}
	}

	/**
	 * Derive a shared secret using X25519 ECDH key exchange.
	 * The shared secret is further hashed with SHA-256 to produce a 256-bit AES key.
	 */
	deriveSharedSecret(privateKeyHex: string, publicKeyHex: string): Buffer {
		const privateKey = createPrivateKey({
			key: Buffer.from(privateKeyHex, 'hex'),
			format: 'der',
			type: 'pkcs8',
		})

		const publicKey = createPublicKey({
			key: Buffer.from(publicKeyHex, 'hex'),
			format: 'der',
			type: 'spki',
		})

		const shared = diffieHellman({ privateKey, publicKey })

		// Hash the raw shared secret to produce a uniform 256-bit key
		return createHash('sha256').update(shared).digest()
	}

	/**
	 * Encrypt a plaintext message using the recipient's public key and sender's private key.
	 * Uses X25519 ECDH for key agreement, then AES-256-GCM for encryption.
	 */
	encrypt(
		plaintext: string,
		recipientPublicKey: string,
		senderPrivateKey: string,
	): EncryptedMessage {
		const sharedKey = this.deriveSharedSecret(senderPrivateKey, recipientPublicKey)
		const iv = randomBytes(IV_LENGTH)

		const cipher = createCipheriv('aes-256-gcm', sharedKey.subarray(0, KEY_LENGTH), iv)

		let ciphertext = cipher.update(plaintext, 'utf8', 'hex')
		ciphertext += cipher.final('hex')
		const authTag = cipher.getAuthTag()

		// Extract sender's public key from the private key for inclusion in the message
		const senderPriv = createPrivateKey({
			key: Buffer.from(senderPrivateKey, 'hex'),
			format: 'der',
			type: 'pkcs8',
		})
		const senderPub = createPublicKey(senderPriv)
		const senderPublicKey = senderPub.export({ type: 'spki', format: 'der' }).toString('hex')

		return {
			ciphertext,
			iv: iv.toString('hex'),
			authTag: authTag.toString('hex'),
			senderPublicKey,
		}
	}

	/**
	 * Decrypt an encrypted message using the sender's public key and recipient's private key.
	 * Verifies the sender's public key matches the one embedded in the encrypted message.
	 */
	decrypt(
		encrypted: EncryptedMessage,
		senderPublicKey: string,
		recipientPrivateKey: string,
	): string {
		// Verify sender identity
		if (encrypted.senderPublicKey !== senderPublicKey) {
			throw new Error('Sender public key mismatch: the message was not sent by the expected sender')
		}

		const sharedKey = this.deriveSharedSecret(recipientPrivateKey, senderPublicKey)
		const iv = Buffer.from(encrypted.iv, 'hex')
		const authTag = Buffer.from(encrypted.authTag, 'hex')

		const decipher = createDecipheriv('aes-256-gcm', sharedKey.subarray(0, KEY_LENGTH), iv)
		decipher.setAuthTag(authTag)

		let plaintext = decipher.update(encrypted.ciphertext, 'hex', 'utf8')
		plaintext += decipher.final('utf8')

		return plaintext
	}
}

export const e2eEncryption = new E2EEncryption()
