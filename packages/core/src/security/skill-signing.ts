import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto'
import { readFile } from 'node:fs/promises'

export type TrustLevel = 'verified' | 'signed' | 'unsigned' | 'revoked'

export class SkillSigner {
	/**
	 * Generate an Ed25519 key pair for skill signing.
	 * Returns hex-encoded public and private keys.
	 */
	generateKeyPair(): { publicKey: string; privateKey: string } {
		const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
			publicKeyEncoding: { type: 'spki', format: 'der' },
			privateKeyEncoding: { type: 'pkcs8', format: 'der' },
		})

		return {
			publicKey: Buffer.from(publicKey).toString('hex'),
			privateKey: Buffer.from(privateKey).toString('hex'),
		}
	}

	/**
	 * Sign the contents of a skill manifest file.
	 * Reads the file, normalizes the JSON, and signs the content.
	 * Returns a hex-encoded signature.
	 */
	async signSkill(manifestPath: string, privateKeyHex: string): Promise<string> {
		const content = await readFile(manifestPath, 'utf-8')
		// Normalize JSON to ensure consistent signing regardless of formatting
		const normalized = JSON.stringify(JSON.parse(content))
		return this.signData(normalized, privateKeyHex)
	}

	/**
	 * Verify the signature of a skill manifest file.
	 * Returns true if the signature is valid for the manifest content.
	 */
	async verifySkill(
		manifestPath: string,
		signature: string,
		publicKeyHex: string,
	): Promise<boolean> {
		const content = await readFile(manifestPath, 'utf-8')
		const normalized = JSON.stringify(JSON.parse(content))
		return this.verifyData(normalized, signature, publicKeyHex)
	}

	/**
	 * Sign arbitrary data with an Ed25519 private key.
	 * Returns a hex-encoded signature.
	 */
	signData(data: string, privateKeyHex: string): string {
		const privateKey = createPrivateKey({
			key: Buffer.from(privateKeyHex, 'hex'),
			format: 'der',
			type: 'pkcs8',
		})

		const signature = sign(null, Buffer.from(data, 'utf-8'), privateKey)
		return signature.toString('hex')
	}

	/**
	 * Verify an Ed25519 signature against data and a public key.
	 * Returns true if the signature is valid.
	 */
	verifyData(data: string, signatureHex: string, publicKeyHex: string): boolean {
		try {
			const publicKey = createPublicKey({
				key: Buffer.from(publicKeyHex, 'hex'),
				format: 'der',
				type: 'spki',
			})

			return verify(null, Buffer.from(data, 'utf-8'), publicKey, Buffer.from(signatureHex, 'hex'))
		} catch {
			return false
		}
	}
}

export const skillSigner = new SkillSigner()
