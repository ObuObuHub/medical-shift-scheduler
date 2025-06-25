export default function handler(req, res) {
  const deploymentTime = new Date().toISOString();
  
  res.status(200).json({
    message: "Deployment test successful!",
    timestamp: deploymentTime,
    github_to_vercel: "WORKING",
    test_id: "deploy-test-" + Date.now()
  });
}