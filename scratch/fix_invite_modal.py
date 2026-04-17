import os

filepath = r'c:\Users\shing\OneDrive\Desktop\Project\FastLinereceiptteste\src\app\cost\components\LineUsersTab.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if i + 1 == 302: # <div className="flex-1 overflow-y-auto px-8 max-h-[60vh]">
        new_lines.append('                 <div className="flex-1 overflow-y-auto px-8 max-h-[70vh]">\n')
        new_lines.append('                   {!generatedHash ? (\n')
        continue
    if i + 1 == 304: # <div className="space-y-6 py-4">
        new_lines.append(line)
        continue
    if i + 1 == 425: # {generatedHash && (
        skip = True
        continue
    if i + 1 == 474: # )}
        skip = False
        new_lines.append('                    </div>\n')
        new_lines.append('                   ) : (\n')
        new_lines.append('                      <div className="py-8 animate-in zoom-in-95 duration-500">\n')
        new_lines.append('                        <div className="flex flex-col items-center justify-center p-6 bg-emerald-50/50 rounded-[2.5rem] border border-emerald-100 gap-6">\n')
        new_lines.append('                            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center w-full">\n')
        new_lines.append('                                {!botId ? (\n')
        new_lines.append('                                  <div className="w-full py-6 flex flex-col items-center justify-center text-center gap-2 text-amber-600 bg-amber-50 rounded-2xl border border-amber-100">\n')
        new_lines.append('                                    <span className="text-2xl">⏳</span>\n')
        new_lines.append('                                     <p className="text-[10px] font-black leading-tight">LINE Bot IDを同期中です</p>\n')
        new_lines.append('                                  </div>\n')
        new_lines.append('                                ) : (\n')
        new_lines.append('                                  <div className="relative group">\n')
        new_lines.append('                                    <img src={qrUrl} className="w-52 h-52 mb-4 transition-transform group-hover:scale-105" alt="Invite QR" />\n')
        new_lines.append('                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 pointer-events-none rounded-xl">\n')
        new_lines.append('                                      <LinkIcon className="w-8 h-8 text-indigo-500 drop-shadow-md" />\n')
        new_lines.append('                                    </div>\n')
        new_lines.append('                                  </div>\n')
        new_lines.append('                                )}\n')
        new_lines.append('\n')
        new_lines.append('                                {qrData && (\n')
        new_lines.append('                                  <div className="bg-slate-50 px-5 py-4 rounded-2xl mb-4 border border-slate-200 w-full break-all cursor-pointer hover:bg-slate-100 transition-colors"\n')
        new_lines.append('                                       onClick={() => {\n')
        new_lines.append('                                         navigator.clipboard.writeText(qrData);\n')
        new_lines.append('                                         toast({ title: "コピーしました" });\n')
        new_lines.append('                                       }}>\n')
        new_lines.append('                                    <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-widest text-center">招待リンク</p>\n')
        new_lines.append('                                    <p className="text-[11px] font-mono text-slate-600 overflow-hidden text-ellipsis text-center">{qrData}</p>\n')
        new_lines.append('                                  </div>\n')
        new_lines.append('                                )}\n')
        new_lines.append('\n')
        new_lines.append('                                <Button\n')
        new_lines.append('                                  variant="secondary"\n')
        new_lines.append('                                  className="w-full h-14 rounded-2xl font-black gap-2 shadow-sm bg-slate-900 text-white hover:bg-slate-800"\n')
        new_lines.append('                                  onClick={() => {\n')
        new_lines.append('                                    navigator.clipboard.writeText(qrData || generatedHash);\n')
        new_lines.append('                                    toast({ title: "コピーしました" });\n')
        new_lines.append('                                  }}\n')
        new_lines.append('                                >\n')
        new_lines.append('                                  <LinkIcon className="w-4 h-4" /> リンクをコピーして共有\n')
        new_lines.append('                                </Button>\n')
        new_lines.append('                            </div>\n')
        new_lines.append('\n')
        new_lines.append('                             <div className="text-center space-y-2 px-6">\n')
        new_lines.append('                                <p className="text-sm font-black text-slate-900">QRコードまたはリンクを送信</p>\n')
        new_lines.append('                                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">\n')
        new_lines.append('                                    招待された方は、LINEを起動してこのQRを読み取るか、リンクをクリックしてメッセージを送信するだけで登録が完了します。\n')
        new_lines.append('                                </p>\n')
        new_lines.append('                            </div>\n')
        new_lines.append('                        </div>\n')
        new_lines.append('                      </div>\n')
        new_lines.append('                   )}\n')
        continue
    
    if not skip:
        new_lines.append(line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Modal de convites simplificado com sucesso!")
