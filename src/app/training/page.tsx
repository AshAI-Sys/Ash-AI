// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import TikTokLayout from '@/components/layout/TikTokLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import {
  GraduationCap,
  BookOpen,
  Video,
  Award,
  Users,
  TrendingUp,
  Calendar,
  Clock,
  Star,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Upload,
  Brain,
  Target,
  Zap,
  Activity,
  BarChart3,
  PieChart,
  Settings,
  Plus,
  Eye,
  Edit,
  Share,
  Heart,
  MessageSquare,
  Bookmark,
  FileText,
  Monitor,
  Smartphone,
  Headphones,
  Camera,
  Mic,
  Globe,
  Shield,
  Database,
  Cpu
} from 'lucide-react'
import { Role } from '@prisma/client'

interface TrainingModule {
  id: string
  title: string
  description: string
  category: 'SAFETY' | 'TECHNICAL' | 'SOFT_SKILLS' | 'COMPLIANCE' | 'ONBOARDING'
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  duration: number // minutes
  videoUrl?: string
  documentsUrl?: string[]
  quiz?: {
    questions: number
    passingScore: number
  }
  prerequisites?: string[]
  certificationId?: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  enrolledCount: number
  completionRate: number
  rating: number
  tags: string[]
}

interface EmployeeProgress {
  employeeId: string
  employeeName: string
  moduleId: string
  moduleTitle: string
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  progress: number
  startedAt?: string
  completedAt?: string
  score?: number
  timeSpent: number // minutes
  attempts: number
  lastAccessed: string
}

interface Certification {
  id: string
  name: string
  description: string
  requiredModules: string[]
  validityPeriod: number // months
  badgeUrl?: string
}

interface SkillAssessment {
  id: string
  skillName: string
  employeeId: string
  employeeName: string
  currentLevel: number // 1-5
  targetLevel: number
  assessmentDate: string
  nextAssessmentDate: string
  improvements: string[]
  strengths: string[]
}

interface KnowledgeBaseArticle {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  author: string
  createdAt: string
  updatedAt: string
  views: number
  likes: number
  searchKeywords: string[]
  attachments?: string[]
}

interface LearningPath {
  id: string
  name: string
  description: string
  targetRole: string
  estimatedDuration: number // hours
  modules: string[]
  enrolledEmployees: number
  completionRate: number
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
}

const mockTrainingModules: TrainingModule[] = [
  {
    id: '1',
    title: 'Workplace Safety Fundamentals',
    description: 'Essential safety protocols for manufacturing environment',
    category: 'SAFETY',
    difficulty: 'BEGINNER',
    duration: 45,
    videoUrl: 'https://vimeo.com/safety-training',
    quiz: { questions: 10, passingScore: 80 },
    status: 'PUBLISHED',
    enrolledCount: 125,
    completionRate: 94,
    rating: 4.8,
    tags: ['safety', 'mandatory', 'manufacturing']
  },
  {
    id: '2',
    title: 'Advanced Sewing Techniques',
    description: 'Master advanced sewing operations and quality standards',
    category: 'TECHNICAL',
    difficulty: 'ADVANCED',
    duration: 120,
    videoUrl: 'https://vimeo.com/sewing-advanced',
    prerequisites: ['Basic Sewing Operations'],
    certificationId: 'cert-sewing-expert',
    status: 'PUBLISHED',
    enrolledCount: 45,
    completionRate: 78,
    rating: 4.9,
    tags: ['sewing', 'technical', 'advanced']
  },
  {
    id: '3',
    title: 'Customer Service Excellence',
    description: 'Delivering exceptional customer experiences',
    category: 'SOFT_SKILLS',
    difficulty: 'INTERMEDIATE',
    duration: 60,
    quiz: { questions: 15, passingScore: 75 },
    status: 'PUBLISHED',
    enrolledCount: 89,
    completionRate: 85,
    rating: 4.6,
    tags: ['customer-service', 'communication', 'soft-skills']
  },
  {
    id: '4',
    title: 'BIR Tax Compliance Training',
    description: 'Philippine tax regulations and compliance procedures',
    category: 'COMPLIANCE',
    difficulty: 'INTERMEDIATE',
    duration: 90,
    documentsUrl: ['bir-manual.pdf', 'tax-forms.pdf'],
    quiz: { questions: 20, passingScore: 85 },
    status: 'PUBLISHED',
    enrolledCount: 32,
    completionRate: 91,
    rating: 4.7,
    tags: ['compliance', 'bir', 'tax', 'philippines']
  },
  {
    id: '5',
    title: 'New Employee Orientation',
    description: 'Welcome to ASH AI - Company culture and procedures',
    category: 'ONBOARDING',
    difficulty: 'BEGINNER',
    duration: 180,
    videoUrl: 'https://vimeo.com/onboarding',
    documentsUrl: ['employee-handbook.pdf', 'benefits-guide.pdf'],
    status: 'PUBLISHED',
    enrolledCount: 156,
    completionRate: 98,
    rating: 4.9,
    tags: ['onboarding', 'orientation', 'culture']
  }
]

const mockEmployeeProgress: EmployeeProgress[] = [
  {
    employeeId: '1',
    employeeName: 'Juan Dela Cruz',
    moduleId: '1',
    moduleTitle: 'Workplace Safety Fundamentals',
    status: 'COMPLETED',
    progress: 100,
    startedAt: '2025-09-10T08:00',
    completedAt: '2025-09-10T09:30',
    score: 95,
    timeSpent: 50,
    attempts: 1,
    lastAccessed: '2025-09-10T09:30'
  },
  {
    employeeId: '1',
    employeeName: 'Juan Dela Cruz',
    moduleId: '2',
    moduleTitle: 'Advanced Sewing Techniques',
    status: 'IN_PROGRESS',
    progress: 65,
    startedAt: '2025-09-12T10:00',
    timeSpent: 78,
    attempts: 1,
    lastAccessed: '2025-09-15T14:30'
  },
  {
    employeeId: '2',
    employeeName: 'Maria Santos',
    moduleId: '1',
    moduleTitle: 'Workplace Safety Fundamentals',
    status: 'COMPLETED',
    progress: 100,
    startedAt: '2025-09-11T09:00',
    completedAt: '2025-09-11T10:15',
    score: 88,
    timeSpent: 45,
    attempts: 1,
    lastAccessed: '2025-09-11T10:15'
  },
  {
    employeeId: '3',
    employeeName: 'Pedro Garcia',
    moduleId: '3',
    moduleTitle: 'Customer Service Excellence',
    status: 'FAILED',
    progress: 100,
    startedAt: '2025-09-08T13:00',
    completedAt: '2025-09-08T14:30',
    score: 65,
    timeSpent: 75,
    attempts: 2,
    lastAccessed: '2025-09-14T16:00'
  }
]

const mockCertifications: Certification[] = [
  {
    id: 'cert-safety-expert',
    name: 'Safety Expert Certification',
    description: 'Certified in workplace safety protocols and emergency procedures',
    requiredModules: ['1', 'safety-advanced', 'emergency-response'],
    validityPeriod: 12,
    badgeUrl: '/badges/safety-expert.png'
  },
  {
    id: 'cert-sewing-expert',
    name: 'Advanced Sewing Specialist',
    description: 'Expert-level sewing operations and quality control',
    requiredModules: ['2', 'quality-control-sewing'],
    validityPeriod: 24,
    badgeUrl: '/badges/sewing-expert.png'
  },
  {
    id: 'cert-compliance-officer',
    name: 'Compliance Officer Certification',
    description: 'Certified in Philippine business compliance and regulations',
    requiredModules: ['4', 'labor-law', 'data-privacy'],
    validityPeriod: 18,
    badgeUrl: '/badges/compliance-officer.png'
  }
]

const mockSkillAssessments: SkillAssessment[] = [
  {
    id: '1',
    skillName: 'Sewing Operations',
    employeeId: '1',
    employeeName: 'Juan Dela Cruz',
    currentLevel: 4,
    targetLevel: 5,
    assessmentDate: '2025-09-01',
    nextAssessmentDate: '2025-12-01',
    improvements: ['Advanced pattern cutting', 'Speed optimization'],
    strengths: ['Quality consistency', 'Equipment maintenance']
  },
  {
    id: '2',
    skillName: 'Quality Control',
    employeeId: '2',
    employeeName: 'Maria Santos',
    currentLevel: 3,
    targetLevel: 4,
    assessmentDate: '2025-08-15',
    nextAssessmentDate: '2025-11-15',
    improvements: ['Defect classification', 'Statistical analysis'],
    strengths: ['Attention to detail', 'Documentation']
  },
  {
    id: '3',
    skillName: 'Customer Service',
    employeeId: '3',
    employeeName: 'Pedro Garcia',
    currentLevel: 2,
    targetLevel: 4,
    assessmentDate: '2025-09-05',
    nextAssessmentDate: '2025-12-05',
    improvements: ['Conflict resolution', 'Product knowledge', 'Communication skills'],
    strengths: ['Patience', 'Empathy']
  }
]

const mockKnowledgeBase: KnowledgeBaseArticle[] = [
  {
    id: '1',
    title: 'Troubleshooting Sewing Machine Issues',
    content: 'Common sewing machine problems and their solutions...',
    category: 'Technical',
    tags: ['sewing', 'troubleshooting', 'maintenance'],
    author: 'Maria Santos',
    createdAt: '2025-08-20',
    updatedAt: '2025-09-10',
    views: 234,
    likes: 45,
    searchKeywords: ['sewing machine', 'problems', 'repair', 'maintenance'],
    attachments: ['sewing-machine-diagram.pdf']
  },
  {
    id: '2',
    title: 'BIR Form 2550Q Filing Procedures',
    content: 'Step-by-step guide for quarterly VAT return filing...',
    category: 'Compliance',
    tags: ['bir', 'tax', 'vat', 'filing'],
    author: 'Finance Team',
    createdAt: '2025-07-15',
    updatedAt: '2025-09-01',
    views: 156,
    likes: 32,
    searchKeywords: ['bir', 'vat', 'quarterly', 'filing', 'form 2550q'],
    attachments: ['form-2550q-sample.pdf', 'filing-checklist.pdf']
  },
  {
    id: '3',
    title: 'Emergency Response Procedures',
    content: 'Safety protocols for workplace emergencies...',
    category: 'Safety',
    tags: ['safety', 'emergency', 'procedures'],
    author: 'Safety Committee',
    createdAt: '2025-06-30',
    updatedAt: '2025-08-25',
    views: 412,
    likes: 89,
    searchKeywords: ['emergency', 'safety', 'evacuation', 'first aid'],
    attachments: ['emergency-contacts.pdf', 'evacuation-map.pdf']
  }
]

const mockLearningPaths: LearningPath[] = [
  {
    id: '1',
    name: 'Sewing Operator Career Track',
    description: 'Complete learning path from beginner to expert sewing operator',
    targetRole: 'Senior Sewing Operator',
    estimatedDuration: 40,
    modules: ['basic-sewing', '2', 'quality-control-sewing'],
    enrolledEmployees: 23,
    completionRate: 67,
    difficulty: 'BEGINNER'
  },
  {
    id: '2',
    name: 'Management Development Program',
    description: 'Leadership and management skills for supervisory roles',
    targetRole: 'Department Manager',
    estimatedDuration: 60,
    modules: ['leadership-basics', '3', 'conflict-resolution', 'performance-management'],
    enrolledEmployees: 12,
    completionRate: 45,
    difficulty: 'ADVANCED'
  },
  {
    id: '3',
    name: 'Compliance Specialist Track',
    description: 'Comprehensive compliance training for Philippine regulations',
    targetRole: 'Compliance Officer',
    estimatedDuration: 35,
    modules: ['4', 'labor-law', 'data-privacy', 'audit-procedures'],
    enrolledEmployees: 8,
    completionRate: 78,
    difficulty: 'INTERMEDIATE'
  }
]

export default function TrainingPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [modules] = useState<TrainingModule[]>(mockTrainingModules)
  const [progress] = useState<EmployeeProgress[]>(mockEmployeeProgress)
  const [knowledgeBase] = useState<KnowledgeBaseArticle[]>(mockKnowledgeBase)

  const canManageTraining = session?.user.role === Role.ADMIN ||
                           session?.user.role === Role.MANAGER ||
                           session?.user.role === Role.HR_MANAGER

  const isEmployee = session?.user.role === Role.OPERATOR ||
                    session?.user.role === Role.DRIVER ||
                    session?.user.role === Role.WAREHOUSE_STAFF

  const filteredModules = modules.filter(module => {
    const matchesSearch = module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         module.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         module.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = selectedCategory === 'all' || module.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'SAFETY': return 'bg-red-500/20 text-red-400 border-red-500/50'
      case 'TECHNICAL': return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      case 'SOFT_SKILLS': return 'bg-green-500/20 text-green-400 border-green-500/50'
      case 'COMPLIANCE': return 'bg-purple-500/20 text-purple-400 border-purple-500/50'
      case 'ONBOARDING': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'BEGINNER': return 'bg-green-500/20 text-green-400 border-green-500/50'
      case 'INTERMEDIATE': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      case 'ADVANCED': return 'bg-red-500/20 text-red-400 border-red-500/50'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500/20 text-green-400 border-green-500/50'
      case 'IN_PROGRESS': return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      case 'FAILED': return 'bg-red-500/20 text-red-400 border-red-500/50'
      case 'NOT_STARTED': return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  return (
    <TikTokLayout>
      <div className="neural-bg min-h-screen relative">
        {/* Quantum Field Background */}
        <div className="quantum-field">
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className="quantum-particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 12}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 p-6 max-w-7xl mx-auto space-y-8">
          {/* Neural Training Command Center Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-5xl font-bold glitch-text text-white mb-3" data-text="TRAINING COMMAND CENTER">
                🎓 TRAINING COMMAND CENTER
              </h1>
              <p className="text-cyan-300 text-xl font-mono">
                Employee development • Skill assessment • Knowledge management • Certification tracking • AI-powered learning paths
              </p>
            </div>

            <div className="flex gap-4">
              <div className="hologram-card p-4">
                <div className="text-center">
                  <p className="text-sm text-cyan-300 font-mono">ACTIVE LEARNERS</p>
                  <p className="text-2xl font-bold text-white">186</p>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50 mt-1">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +12% THIS MONTH
                  </Badge>
                </div>
              </div>

              {canManageTraining && (
                <>
                  <Button className="neon-btn">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    ANALYTICS
                  </Button>

                  <Button className="neon-btn-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    CREATE MODULE
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Advanced Training Metrics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="hologram-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-cyan-300 font-mono">COMPLETION RATE</p>
                    <p className="text-3xl font-bold text-white">87.4%</p>
                    <p className="text-xs text-green-400 mt-1">Above target</p>
                  </div>
                  <div className="ai-orb">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hologram-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-cyan-300 font-mono">AVG SCORE</p>
                    <p className="text-3xl font-bold text-white">91.2%</p>
                    <p className="text-xs text-blue-400 mt-1">Excellent performance</p>
                  </div>
                  <div className="ai-orb">
                    <Star className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hologram-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-cyan-300 font-mono">CERTIFICATIONS</p>
                    <p className="text-3xl font-bold text-white">45</p>
                    <p className="text-xs text-purple-400 mt-1">Awarded this month</p>
                  </div>
                  <div className="ai-orb">
                    <Award className="h-6 w-6 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hologram-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-cyan-300 font-mono">LEARNING HOURS</p>
                    <p className="text-3xl font-bold text-white">2,847</p>
                    <p className="text-xs text-yellow-400 mt-1">Total this quarter</p>
                  </div>
                  <div className="ai-orb">
                    <Clock className="h-6 w-6 text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Neural Command Interface */}
          <Card className="quantum-card border-cyan-500/30 mb-8">
            <CardContent className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-6 mb-6">
                  <TabsTrigger value="overview" className="cyber-tab">
                    <Monitor className="w-4 h-4 mr-2" />
                    OVERVIEW
                  </TabsTrigger>
                  <TabsTrigger value="modules" className="cyber-tab">
                    <BookOpen className="w-4 h-4 mr-2" />
                    MODULES
                  </TabsTrigger>
                  <TabsTrigger value="progress" className="cyber-tab">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    PROGRESS
                  </TabsTrigger>
                  <TabsTrigger value="skills" className="cyber-tab">
                    <Target className="w-4 h-4 mr-2" />
                    SKILLS
                  </TabsTrigger>
                  <TabsTrigger value="knowledge" className="cyber-tab">
                    <Database className="w-4 h-4 mr-2" />
                    KNOWLEDGE
                  </TabsTrigger>
                  <TabsTrigger value="paths" className="cyber-tab">
                    <Brain className="w-4 h-4 mr-2" />
                    PATHS
                  </TabsTrigger>
                </TabsList>

                {/* Search and Filters */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyan-400" />
                    <input
                      placeholder="SEARCH NEURAL TRAINING DATABASE..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="cyber-input pl-10"
                    />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="cyber-select"
                  >
                    <option value="all">ALL CATEGORIES</option>
                    <option value="SAFETY">SAFETY</option>
                    <option value="TECHNICAL">TECHNICAL</option>
                    <option value="SOFT_SKILLS">SOFT SKILLS</option>
                    <option value="COMPLIANCE">COMPLIANCE</option>
                    <option value="ONBOARDING">ONBOARDING</option>
                  </select>
                </div>

                <TabsContent value="overview">
                  {/* Quick Stats and Recent Activity */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="quantum-card border-green-500/20">
                      <CardHeader>
                        <CardTitle className="flex items-center text-white">
                          <div className="ai-orb mr-3">
                            <Activity className="w-6 h-6 text-green-400" />
                          </div>
                          RECENT ACTIVITY
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {progress.slice(0, 4).map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-cyan-500/10">
                            <div>
                              <p className="text-white font-medium">{item.employeeName}</p>
                              <p className="text-cyan-300 text-sm">{item.moduleTitle}</p>
                            </div>
                            <Badge className={getStatusColor(item.status)}>
                              {item.status}
                            </Badge>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="quantum-card border-purple-500/20">
                      <CardHeader>
                        <CardTitle className="flex items-center text-white">
                          <div className="ai-orb mr-3">
                            <Award className="w-6 h-6 text-purple-400" />
                          </div>
                          TOP PERFORMERS
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {mockSkillAssessments.slice(0, 3).map((skill, index) => (
                          <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-purple-500/10">
                            <div>
                              <p className="text-white font-medium">{skill.employeeName}</p>
                              <p className="text-cyan-300 text-sm">{skill.skillName}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${i < skill.currentLevel ? 'text-yellow-400 fill-current' : 'text-gray-600'}`}
                                  />
                                ))}
                              </div>
                              <p className="text-xs text-gray-400">Level {skill.currentLevel}/5</p>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="modules">
                  {/* Training Modules Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredModules.map((module) => (
                      <Card key={module.id} className="quantum-card border-cyan-500/20 hover:border-cyan-500/40 transition-all">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="ai-orb">
                                {module.category === 'SAFETY' ? <Shield className="w-6 h-6 text-red-400" /> :
                                 module.category === 'TECHNICAL' ? <Cpu className="w-6 h-6 text-blue-400" /> :
                                 module.category === 'SOFT_SKILLS' ? <Users className="w-6 h-6 text-green-400" /> :
                                 module.category === 'COMPLIANCE' ? <FileText className="w-6 h-6 text-purple-400" /> :
                                 <GraduationCap className="w-6 h-6 text-yellow-400" />}
                              </div>
                              <div>
                                <h4 className="text-lg font-bold text-white">{module.title}</h4>
                                <p className="text-cyan-300 text-sm">{module.description}</p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <Badge className={getCategoryColor(module.category)}>
                                {module.category.replace('_', ' ')}
                              </Badge>
                              <Badge className={getDifficultyColor(module.difficulty)}>
                                {module.difficulty}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-400">Duration</p>
                              <p className="text-white font-mono">{module.duration} min</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Enrolled</p>
                              <p className="text-white font-mono">{module.enrolledCount} students</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Completion Rate</p>
                              <p className="text-white font-mono">{module.completionRate}%</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Rating</p>
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                <span className="text-white font-mono">{module.rating}</span>
                              </div>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                            <div
                              className="bg-cyan-400 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${module.completionRate}%` }}
                            />
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {module.tags.map((tag, index) => (
                              <Badge key={index} className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Button className="neon-btn-outline text-xs flex-1">
                              <Play className="w-3 h-3 mr-1" />
                              START
                            </Button>
                            <Button className="neon-btn-outline text-xs">
                              <Eye className="w-3 h-3 mr-1" />
                              PREVIEW
                            </Button>
                            {canManageTraining && (
                              <Button className="neon-btn-outline text-xs">
                                <Edit className="w-3 h-3 mr-1" />
                                EDIT
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="progress">
                  {/* Employee Progress Tracking */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white mb-4">Employee Progress Tracking</h3>

                    {progress.map((item, index) => (
                      <Card key={index} className="quantum-card border-blue-500/20">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-bold text-white">{item.employeeName}</h4>
                              <p className="text-cyan-300">{item.moduleTitle}</p>
                            </div>
                            <Badge className={getStatusColor(item.status)}>
                              {item.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-400">Progress</p>
                              <p className="text-white font-mono">{item.progress}%</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Time Spent</p>
                              <p className="text-white font-mono">{item.timeSpent} min</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Score</p>
                              <p className="text-white font-mono">{item.score || 'N/A'}%</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Attempts</p>
                              <p className="text-white font-mono">{item.attempts}</p>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                            <div
                              className={`h-3 rounded-full transition-all duration-500 ${item.status === 'COMPLETED' ? 'bg-green-400' : item.status === 'FAILED' ? 'bg-red-400' : 'bg-blue-400'}`}
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-400">Last accessed: {new Date(item.lastAccessed).toLocaleDateString()}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="skills">
                  {/* Skill Assessments */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white mb-4">Skill Assessment Matrix</h3>

                    {mockSkillAssessments.map((skill, index) => (
                      <Card key={index} className="quantum-card border-purple-500/20">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-bold text-white">{skill.employeeName}</h4>
                              <p className="text-cyan-300">{skill.skillName}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 mb-1">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${i < skill.currentLevel ? 'text-yellow-400 fill-current' : 'text-gray-600'}`}
                                  />
                                ))}
                              </div>
                              <p className="text-xs text-gray-400">Current: Level {skill.currentLevel}/5</p>
                              <p className="text-xs text-purple-400">Target: Level {skill.targetLevel}/5</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-400 mb-2">Strengths</p>
                              <div className="space-y-1">
                                {skill.strengths.map((strength, i) => (
                                  <Badge key={i} className="bg-green-500/20 text-green-400 border-green-500/50 text-xs mr-1">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    {strength}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400 mb-2">Areas for Improvement</p>
                              <div className="space-y-1">
                                {skill.improvements.map((improvement, i) => (
                                  <Badge key={i} className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-xs mr-1">
                                    <Target className="w-3 h-3 mr-1" />
                                    {improvement}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
                            <div>
                              <p className="text-xs text-gray-400">Last Assessment: {skill.assessmentDate}</p>
                              <p className="text-xs text-gray-400">Next Assessment: {skill.nextAssessmentDate}</p>
                            </div>
                            <Button className="neon-btn-outline text-xs">
                              <Eye className="w-3 h-3 mr-1" />
                              VIEW DETAILS
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="knowledge">
                  {/* Knowledge Base */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white mb-4">Knowledge Base Articles</h3>

                    {knowledgeBase.map((article, index) => (
                      <Card key={index} className="quantum-card border-green-500/20">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="ai-orb">
                                <FileText className="w-6 h-6 text-green-400" />
                              </div>
                              <div>
                                <h4 className="text-lg font-bold text-white">{article.title}</h4>
                                <p className="text-cyan-300 text-sm">by {article.author}</p>
                              </div>
                            </div>
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                              {article.category}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-400">Views</p>
                              <p className="text-white font-mono">{article.views}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Likes</p>
                              <p className="text-white font-mono">{article.likes}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Updated</p>
                              <p className="text-white font-mono">{article.updatedAt}</p>
                            </div>
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {article.tags.map((tag, i) => (
                              <Badge key={i} className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          {/* Attachments */}
                          {article.attachments && article.attachments.length > 0 && (
                            <div className="mb-4">
                              <p className="text-sm text-gray-400 mb-2">Attachments</p>
                              <div className="flex flex-wrap gap-2">
                                {article.attachments.map((attachment, i) => (
                                  <Badge key={i} className="bg-purple-500/20 text-purple-400 border-purple-500/50 text-xs">
                                    <Download className="w-3 h-3 mr-1" />
                                    {attachment}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button className="neon-btn-outline text-xs">
                              <Eye className="w-3 h-3 mr-1" />
                              READ
                            </Button>
                            <Button className="neon-btn-outline text-xs">
                              <Heart className="w-3 h-3 mr-1" />
                              {article.likes}
                            </Button>
                            <Button className="neon-btn-outline text-xs">
                              <Share className="w-3 h-3 mr-1" />
                              SHARE
                            </Button>
                            {canManageTraining && (
                              <Button className="neon-btn-outline text-xs">
                                <Edit className="w-3 h-3 mr-1" />
                                EDIT
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="paths">
                  {/* Learning Paths */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white mb-4">AI-Powered Learning Paths</h3>

                    {mockLearningPaths.map((path, index) => (
                      <Card key={index} className="quantum-card border-purple-500/20">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="ai-orb">
                                <Brain className="w-6 h-6 text-purple-400" />
                              </div>
                              <div>
                                <h4 className="text-lg font-bold text-white">{path.name}</h4>
                                <p className="text-cyan-300 text-sm">{path.description}</p>
                                <p className="text-gray-400 text-xs">Target Role: {path.targetRole}</p>
                              </div>
                            </div>
                            <Badge className={getDifficultyColor(path.difficulty)}>
                              {path.difficulty}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-400">Duration</p>
                              <p className="text-white font-mono">{path.estimatedDuration}h</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Enrolled</p>
                              <p className="text-white font-mono">{path.enrolledEmployees}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Completion</p>
                              <p className="text-white font-mono">{path.completionRate}%</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Modules</p>
                              <p className="text-white font-mono">{path.modules.length}</p>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                            <div
                              className="bg-purple-400 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${path.completionRate}%` }}
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button className="neon-btn-outline text-xs">
                              <Play className="w-3 h-3 mr-1" />
                              START PATH
                            </Button>
                            <Button className="neon-btn-outline text-xs">
                              <Eye className="w-3 h-3 mr-1" />
                              VIEW MODULES
                            </Button>
                            <Button className="neon-btn-outline text-xs">
                              <Users className="w-3 h-3 mr-1" />
                              ENROLL TEAM
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </TikTokLayout>
  )
}