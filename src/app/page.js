'use client';
import Head from 'next/head';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
   BarChart,
   Bar,
   XAxis,
   YAxis,
   Tooltip,
   Legend,
   CartesianGrid,
   PieChart,
   Pie,
   Cell,
   Radar,
   RadarChart,
   PolarGrid,
   PolarAngleAxis,
   PolarRadiusAxis,
   ResponsiveContainer,
} from 'recharts';

const emotion = {
   LABEL_0: 'sadness',
   LABEL_1: 'joy',
   LABEL_2: 'love',
   LABEL_3: 'anger',
   LABEL_4: 'fear',
   LABEL_5: 'surprise',
};
const COLORS = ['#0088FE', '#00C49F', '#FF8042', '#f3e042', '#42f3e0'];
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({
   cx,
   cy,
   midAngle,
   innerRadius,
   outerRadius,
   percent,
   index,
}) => {
   const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
   const x = cx + radius * Math.cos(-midAngle * RADIAN);
   const y = cy + radius * Math.sin(-midAngle * RADIAN);

   return (
      <text
         x={x}
         y={y}
         fill='white'
         textAnchor={x > cx ? 'start' : 'end'}
         dominantBaseline='central'>
         {`${(percent * 100).toFixed(2)}%`}
      </text>
   );
};

export default function Home() {
   // Create a reference to the worker object.
   const worker = useRef(null);
   // Keep track of the classification result and the model loading status.
   const [result, setResult] = useState(null);
   const [sentiment, setSentiment] = useState(null);
   // console.log('🚀 ~ Home ~ result:', result);
   const [ready, setReady] = useState(null);

   useEffect(() => {
      if (!worker.current) {
         // Create the worker if it does not yet exist.
         worker.current = new Worker(new URL('./worker.js', import.meta.url), {
            type: 'module',
         });
      }

      // Create a callback function for messages from the worker thread.
      const onMessageReceived = (e) => {
         switch (e.data.status) {
            case 'initiate':
               setReady(false);
               break;
            case 'ready':
               setReady(true);
               break;
            case 'complete':
               // const newOut = e.data.output.map((x) => ({
               //    // Rename keys in x to match the emotion object
               //    label: emotion[x.label],
               //    score: x.score,
               // }));
               // e.data.output.map((x) => {
               //    x.score = x.score.toFixed(2);
               // });
               let total = 0;
               let newResult = [];
               setResult(e.data.output);

               for (let i = 0; i < e.data.output.length; i++) {
                  if (i == 0) {
                     newResult.push(e.data.output[0]);
                     if (e.data.output[0].label === 'POSITIVE') {
                        newResult.push({
                           label: 'NON-POSITIVE',
                           score: 0,
                        });
                     } else if (e.data.output[0].label === 'NEGATIVE') {
                        newResult.push({
                           label: 'NON-NEGATIVE',
                           score: 0,
                        });
                     } else {
                        newResult.push({
                           label: 'NON-NEUTRAL',
                           score: 0,
                        });
                     }
                  } else {
                     total += e.data.output[i].score;
                  }
               }
               newResult[1].score = total;
               setSentiment(newResult);
               break;
         }
      };

      // Attach the callback function as an event listener.
      worker.current.addEventListener('message', onMessageReceived);

      // Define a cleanup function for when the component is unmounted.
      return () =>
         worker.current.removeEventListener('message', onMessageReceived);
   });

   const classify = useCallback((text) => {
      if (worker.current) {
         worker.current.postMessage({ text });
      }
   }, []);

   return (
      <>
         <Head>
            <title>Text Classifier</title>
            <meta
               name='description'
               content='Text classification by Transformers.js'
            />
         </Head>
         <main className='flex min-h-screen flex-col items-center justify-center p-8'>
            <h1 className='text-5xl font-bold mb-2 text-center'>
               Transformers.js
            </h1>
            <h2 className='text-2xl mb-4 text-center'></h2>
            <input
               className='w-full max-w-xs p-2 border border-gray-300 rounded mb-4'
               type='text'
               placeholder='Enter text here'
               onInput={(e) => {
                  classify(e.target.value);
               }}
            />
            {ready !== null && (
               <pre className='bg-gray-100 p-2 rounded'>
                  {!ready || !result
                     ? 'Loading...'
                     : JSON.stringify(result, null, 2)}
               </pre>
            )}
            {result && result !== null ? (
               <div>
                  <div className='text-center font-medium text-3xl mt-6'>
                     Chart result
                  </div>
                  <div className='flex justify-center items-center'>
                     {/* <BarChart width={700} height={400} data={result}>
                        <XAxis dataKey='label' stroke='#8884d8' />
                        <YAxis />
                        <Tooltip
                           wrapperStyle={{ width: 100, backgroundColor: '#ccc' }}
                        />
                        <Legend
                           width={100}
                           wrapperStyle={{
                              top: 40,
                              right: 20,
                              backgroundColor: '#f5f5f5',
                              border: '1px solid #d5d5d5',
                              borderRadius: 3,
                              lineHeight: '40px',
                           }}
                        />
                        <CartesianGrid stroke='#ccc' strokeDasharray='5 5' />
                        <Bar dataKey='score' fill='#8884d8' barSize={30} />
                     </BarChart> */}
                     <div className='flex items-center'>
                        <PieChart width={630} height={350}>
                           <Pie
                              className='w-full'
                              data={sentiment}
                              dataKey='score'
                              nameKey='label'
                              cx='60%'
                              cy='50%'
                              outerRadius={130}
                              fill='#82ca9d'
                              label={renderCustomizedLabel}
                              labelLine={false}>
                              {result.map((entry, index) => (
                                 <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                 />
                              ))}
                           </Pie>
                        </PieChart>
                        <div>
                           {sentiment.map((entry, index) => (
                              <div key={index} className='flex items-center'>
                                 <div
                                    className={`m-2 p-2 w-[64px] h-6`}
                                    style={{
                                       backgroundColor: `${COLORS[index]}`,
                                    }}></div>
                                 <div>{entry.label}</div>
                              </div>
                           ))}
                        </div>
                     </div>
                     {/* <ResponsiveContainer
                        width={700}
                        height={400}
                        className='ml-16'>
                        <RadarChart
                           cx='300'
                           cy='250'
                           outerRadius='150'
                           data={result}>
                           <PolarGrid />
                           <PolarAngleAxis dataKey='label' />
                           <PolarRadiusAxis />
                           <Radar
                              name='label'
                              dataKey='score'
                              stroke='#8884d8'
                              fill='#8884d8'
                              fillOpacity={0.7}
                           />
                        </RadarChart>
                     </ResponsiveContainer> */}
                  </div>
               </div>
            ) : null}
         </main>
      </>
   );
}
