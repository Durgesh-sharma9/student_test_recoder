content = open('server.js', 'r').read()
content = content.replace(
    "import subscriptionRoutes from './routes/subscriptionRoutes.js';",
    "import subscriptionRoutes from './routes/subscriptionRoutes.js';\nimport trialRoutes from './routes/trialRoutes.js';\nimport enterpriseRoutes from './routes/enterpriseRoutes.js';"
)
content = content.replace(
    "app.use('/api/subscriptions', subscriptionRoutes);",
    "app.use('/api/subscriptions', subscriptionRoutes);\napp.use('/api/trial', trialRoutes);\napp.use('/api/enterprise', enterpriseRoutes);"
)
open('server.js', 'w').write(content)
print('Updated server.js')
