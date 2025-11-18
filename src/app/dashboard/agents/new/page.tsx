"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Bot,
  Plus,
  ArrowLeft,
  Save,
  Zap,
  MessageSquare,
  Brain
} from "lucide-react"

import { useAuth } from "@/contexts/AuthContext"
import { apiService } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface AgentFormData {
  name: string
  description: string
  model_name: string
  tone: string
  industry: string
  welcome_message: string
}

const AGENT_TEMPLATES = [
  {
    id: 'customer-service',
    name: 'Customer Service',
    description: 'Handle customer inquiries and support requests',
    icon: MessageSquare,
    tone: 'professional',
    industry: 'general',
    welcome_message: 'Hello! How can I help you today?'
  },
  {
    id: 'sales-assistant',
    name: 'Sales Assistant',
    description: 'Assist with product questions and sales process',
    icon: Zap,
    tone: 'friendly',
    industry: 'retail',
    welcome_message: 'Hi there! I\'m here to help you find the perfect product.'
  },
  {
    id: 'knowledge-base',
    name: 'Knowledge Base',
    description: 'Provide information and answer questions',
    icon: Brain,
    tone: 'informative',
    industry: 'education',
    welcome_message: 'Welcome! I can help answer your questions.'
  },
  {
    id: 'custom',
    name: 'Custom Agent',
    description: 'Create your own custom AI agent',
    icon: Plus,
    tone: 'neutral',
    industry: 'general',
    welcome_message: 'Hello! How can I assist you?'
  }
]

const AVAILABLE_MODELS = [
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and efficient' },
  { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Balanced performance' }
]

const TONE_OPTIONS = [
  { id: 'professional', label: 'Professional', description: 'Formal and business-like' },
  { id: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { id: 'casual', label: 'Casual', description: 'Relaxed and informal' },
  { id: 'neutral', label: 'Neutral', description: 'Balanced and unbiased' }
]

const INDUSTRY_OPTIONS = [
  { id: 'general', label: 'General' },
  { id: 'retail', label: 'Retail' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'finance', label: 'Finance' },
  { id: 'education', label: 'Education' },
  { id: 'technology', label: 'Technology' },
  { id: 'hospitality', label: 'Hospitality' }
]

export default function NewAgentPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [step, setStep] = useState(1)

  const [formData, setFormData] = useState<AgentFormData>({
    name: "",
    description: "",
    model_name: "gpt-3.5-turbo",
    tone: "professional",
    industry: "general",
    welcome_message: "Hello! How can I assist you today?"
  })

  // Authentication check
  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push("/login")
      return
    }

    if (!user.subscription?.is_active) {
      router.push("/payment")
      return
    }
  }, [authLoading, user, router])

  const handleTemplateSelect = (template: typeof AGENT_TEMPLATES[0]) => {
    setSelectedTemplate(template.id)
    setFormData(prev => ({
      ...prev,
      name: template.name,
      description: template.description,
      tone: template.tone,
      industry: template.industry,
      welcome_message: template.welcome_message
    }))
    setStep(2)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const agentData = {
        ...formData,
        is_active: true
      }

      const newAgent = await apiService.createAgent(agentData)
      router.push(`/dashboard/agents/${newAgent.id}`)
    } catch (error: any) {
      console.error("Failed to create agent:", error)
      alert("Failed to create agent. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1)
    } else {
      router.push("/dashboard/agents")
    }
  }

  if (authLoading) {
    return (
      <div className="container-spacing">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-spacing max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-8"
      >
        <Button variant="ghost" onClick={goBack} size="icon">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Create New Agent
          </h1>
          <p className="text-muted-foreground">
            Set up your AI assistant to handle customer conversations
          </p>
        </div>
      </motion.div>

      {/* Progress Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <div className="flex items-center justify-center gap-2">
          {[1, 2].map((stepNumber) => (
            <React.Fragment key={stepNumber}>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                step >= stepNumber
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {stepNumber}
              </div>
              {stepNumber < 2 && (
                <div className={cn(
                  "w-12 h-0.5",
                  step > stepNumber ? "bg-primary" : "bg-muted"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="flex justify-center mt-2 text-sm text-muted-foreground">
          {step === 1 ? "Choose Template" : "Configure Agent"}
        </div>
      </motion.div>

      {/* Step 1: Template Selection */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Choose a Template
            </h2>
            <p className="text-muted-foreground">
              Start with a pre-configured template or create a custom agent
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {AGENT_TEMPLATES.map((template) => {
              const Icon = template.icon
              return (
                <Card
                  key={template.id}
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover-lift",
                    selectedTemplate === template.id
                      ? "ring-2 ring-primary bg-primary/5"
                      : "hover:bg-surface"
                  )}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center",
                        selectedTemplate === template.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">
                          {template.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/agents")}
            >
              Cancel
            </Button>
          </div>
        </motion.div>
      )}

      {/* Step 2: Configuration */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Agent Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., Customer Support Bot"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Describe what this agent does..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Model & Behavior</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    AI Model *
                  </label>
                  <select
                    name="model_name"
                    value={formData.model_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {AVAILABLE_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} - {model.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Tone of Voice
                    </label>
                    <select
                      name="tone"
                      value={formData.tone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {TONE_OPTIONS.map((tone) => (
                        <option key={tone.id} value={tone.id}>
                          {tone.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Industry
                    </label>
                    <select
                      name="industry"
                      value={formData.industry}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {INDUSTRY_OPTIONS.map((industry) => (
                        <option key={industry.id} value={industry.id}>
                          {industry.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Welcome Message
                  </label>
                  <textarea
                    name="welcome_message"
                    value={formData.welcome_message}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="First message your agent will send..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
                Back
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard/agents")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.name}
                  variant="default"
                >
                  <Bot className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Creating..." : "Create Agent"}
                </Button>
              </div>
            </div>
          </form>
        </motion.div>
      )}
    </div>
  )
}