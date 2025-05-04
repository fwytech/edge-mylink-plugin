// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('飞书多维表格链接采集器已安装');
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'saveLink') {
    handleSaveLink(request.url)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开放以支持异步响应
  }
});

// 错误处理函数
function handleError(error) {
  console.error('错误:', error);
  return { success: false, error: error.message };
}

// 日志记录函数
function logInfo(message, data = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    message,
    data
  };
  console.log(JSON.stringify(logEntry));
}