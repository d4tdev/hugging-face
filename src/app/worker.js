import { pipeline, env, AutoTokenizer } from '@xenova/transformers';

// Skip local model check
env.allowLocalModels = false;
// env.localModelPath = '../../finetuning-emotion-model';

// Use the Singleton pattern to enable lazy construction of the pipeline.
class PipelineSingleton {
   static task = 'text-classification';
   static model = 'dearkarina/my_miniroberta_model';
   // static model = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';
   static instance = null;

   static async getInstance(progress_callback = null) {
      if (this.instance === null) {
         this.instance = pipeline(this.task, this.model, { progress_callback });
      }
      return this.instance;
   }
}
function truncate_and_pad(ids, max_length) {
   if (ids.length > max_length) {
      // Truncate
      return ids.slice(0, max_length);
   } else {
      // Pad
      const padding = Array(max_length - ids.length).fill(padding_token_id);
      return ids.concat(padding);
   }
}

let padding_token_id;
let modelName = 'dearkarina/my_miniroberta_model';

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
   const arrayText = event.data.text
      .replace('[', '')
      .replace(']', '')
      .replace('", ', "', ")
      .split("', ");
   console.log(
      '🚀 ~ self.addEventListener ~ arrayText:',
      arrayText,
      Array.isArray(arrayText)
   );
   let results = [];
   // Retrieve the classification pipeline. When called for the first time,
   // this will load the pipeline and save it for future use.
   for (let i = 0; i < arrayText.length; i++) {
      const text = arrayText[i];
      let classifier = await PipelineSingleton.getInstance((x) => {
         // We also add a progress callback to the pipeline so that we can
         // track model loading.

         self.postMessage(x);
      });

      const tokenizer = await AutoTokenizer.from_pretrained(modelName);
      const max_length = 50;
      padding_token_id = tokenizer.pad_token_id;

      const encoded_ids = tokenizer.encode(text);
      const padded_ids = truncate_and_pad(encoded_ids, max_length);

      const tokenizedText = tokenizer.decode(padded_ids);
      // Actually perform the classification
      let output = await classifier(tokenizedText, { topk: 1 });
      results.push(output[0]);
   }
   // console.log('🚀 ~ self.addEventListener ~ output:', output);

   // Send the output back to the main thread
   self.postMessage({
      status: 'complete',
      output: results,
   });
});
