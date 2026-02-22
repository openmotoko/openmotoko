import { Navigate, useNavigate } from 'react-router'
import { OnboardingFlow } from '../components/onboarding/onboarding-flow'
import { useStore } from '../lib/store'

export function OnboardPage() {
	const navigate = useNavigate()
	const { onboardingComplete, setOnboardingComplete } = useStore()

	if (onboardingComplete) {
		return <Navigate to="/chat" replace />
	}

	const handleComplete = () => {
		setOnboardingComplete(true)
		navigate('/chat', { replace: true })
	}

	return <OnboardingFlow onComplete={handleComplete} />
}
