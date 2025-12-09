'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, AlertCircle, Wrench, Zap, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const tasks = [
  { title: 'Bug Fixes', status: 'completed', label: 'Done', color: 'success', icon: CheckCircle },
  { title: 'Performance Optimization', status: 'working', label: 'Working', color: 'warning', icon: Loader2 },
  { title: 'UI Improvements', status: 'working', label: 'Working', color: 'warning', icon: Loader2 },
  { title: 'Testing', status: 'pending', label: 'Pending', color: 'muted', icon: Clock },
];

export default function UnderDevelopment() {
  const handleGoBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="min-h-[calc(100vh-12rem)] flex items-center justify-center"
        >
          <div className="w-full max-w-4xl text-center space-y-8">
            {/* Header Icon */}
            <motion.div
              initial={{ scale: 0, rotate: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-24 h-24 mx-auto"
            >
              <div className="w-full h-full rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Wrench className="h-12 w-12 text-white" />
                </motion.div>
              </div>
            </motion.div>

            {/* Title and Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <h1 className="text-4xl md:text-6xl font-bold text-foreground">
                <span className="bg-gradient-to-r from-orange-500 via-red-600 to-pink-600 bg-clip-text text-transparent">
                  Under Development
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                This feature is currently being improved and optimized. We&apos;re making it better for you!
              </p>
            </motion.div>

            {/* Maintenance Alert */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="card-shadow border-l-4 border-l-orange-500 bg-orange-500/5">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-foreground mb-2">Temporary Maintenance</h3>
                      <p className="text-sm text-muted-foreground">
                        We&apos;re working on improvements and bug fixes. This feature will be back online shortly.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Development Tasks */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-orange-600" />
                    Development Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {tasks.map((task, index) => {
                      const Icon = task.icon;
                      return (
                        <motion.div
                          key={task.title}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + index * 0.1 }}
                        >
                          <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center">
                                <Icon className={`h-4 w-4 ${
                                  task.status === 'working' ? 'animate-spin text-orange-600' :
                                  task.status === 'completed' ? 'text-green-600' : 'text-muted-foreground'
                                }`} />
                              </div>
                              <span className="font-medium text-foreground text-sm">{task.title}</span>
                            </div>
                            <Badge variant={task.color} className="text-xs">
                              {task.label}
                            </Badge>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Progress Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card className="card-shadow">
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="font-medium">Overall Progress</span>
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="text-foreground font-semibold"
                      >
                        45%
                      </motion.span>
                    </div>
                    <div className="w-full bg-surface rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "45%" }}
                        transition={{ delay: 0.9, duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-orange-500 via-red-600 to-pink-600 rounded-full"
                      />
                    </div>
                    <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>ETA: 2 hours</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        <span>In Progress</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Action Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="space-y-4"
            >
              <Button
                onClick={handleGoBack}
                variant="outline"
                className="group"
                size="lg"
              >
                <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Go Back
              </Button>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span>Maintenance in progress</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}