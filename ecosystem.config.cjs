module.exports = {
  apps: [{
    name: 'coeldery-ft',
    script: 'npx',
    args: 'wrangler pages dev dist --d1=coeldery-family-tree-db --local --ip 0.0.0.0 --port 3000',
    cwd: '/home/user/coeldery-family-tree',
    env: { NODE_ENV: 'development' },
    watch: false, instances: 1, exec_mode: 'fork'
  }]
}
