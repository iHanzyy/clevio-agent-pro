'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Rocket, Calendar, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ComingSoon() {
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
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-24 h-24 mx-auto"
            >
              <div className="w-full h-full rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Rocket className="h-12 w-12 text-white" />
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
                <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  Coming Soon
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                We&apos;re working hard to bring you something amazing! This feature is currently under development and will be available soon.
              </p>
            </motion.div>

            {/* Progress Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="card-shadow">
                <CardContent className="p-6 md:p-8">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="font-medium">Development Progress</span>
                      <span className="text-foreground font-semibold">75%</span>
                    </div>
                    <div className="w-full bg-surface rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "75%" }}
                        transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-full"
                      />
                    </div>
                    <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Q2 2024</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-purple-600" />
                        <span>High Priority</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Features Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {[
                { icon: "🚀", title: "Enhanced Performance", description: "Faster and more efficient" },
                { icon: "🎨", title: "Better UI/UX", description: "Improved user experience" },
                { icon: "🔧", title: "New Features", description: "Exciting capabilities" }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <Card className="card-hover h-full">
                    <CardContent className="p-4 text-center space-y-3">
                      <div className="text-3xl">{feature.icon}</div>
                      <h3 className="font-semibold text-foreground text-sm">{feature.title}</h3>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* Action Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
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
                <Clock className="h-4 w-4 animate-pulse text-purple-600" />
                <span>Feature in development queue</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
