export interface OnboardingData {
	provider: string | null
	apiKey: string
	ollamaHost: string
	model: string | null
	enabledSkills: string[]
	channels: string[]
}

export interface StepProps {
	data: OnboardingData
	onChange: (update: Partial<OnboardingData>) => void
}
