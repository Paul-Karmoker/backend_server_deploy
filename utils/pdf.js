import PDFDocument from 'pdfkit';

export const generatePDF = async (session) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const buffers = [];
    doc.on('data', (b) => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    doc.fontSize(18).text('Written Test Result', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12)
      .text(`Candidate: ${session.userId?.name || 'N/A'}`)
      .text(`Email: ${session.userId?.email || 'N/A'}`)
      .text(`Job Title: ${session.jobTitle}`)
      .text(`Experience: ${session.experienceYears} years`)
      .text(`Skills: ${(session.skills || []).join(', ')}`)
      .text(`Duration: ${session.durationMinutes} minutes`)
      .text(`Status: ${session.status}`)
      .text(`Score: ${session.totalScore}/${session.questions.length}`)
      .moveDown();

    session.questions.forEach((q, i) => {
      doc.fontSize(12).text(`${i + 1}. ${q.question}`);
      if (q.userAnswer) doc.text(`Your Answer: ${q.userAnswer}`);
      if (q.feedback) doc.text(`Feedback: ${q.feedback}`);
      doc.text(`Correct Answer: ${q.idealAnswer}`);
      doc.text(`Result: ${q.isCorrect ? '✅ Correct' : '❌ Incorrect'} (Score: ${q.score})`);
      doc.moveDown();
    });

    doc.end();
  });
