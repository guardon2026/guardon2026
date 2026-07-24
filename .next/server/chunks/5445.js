"use strict";exports.id=5445,exports.ids=[5445,3538],exports.modules={49303:(e,t,a)=>{e.exports=a(30517)},89355:(e,t,a)=>{a.d(t,{Z:()=>s});let s={providers:[],session:{strategy:"jwt"},callbacks:{session:async({session:e,token:t})=>(t&&(e.user.role=t.role,e.user.id=t.userId),e)},pages:{signIn:"/login",error:"/login"}}},95456:(e,t,a)=>{a.a(e,async(e,s)=>{try{a.d(t,{I8:()=>c,handlers:()=>o,zB:()=>h});var i=a(39207),r=a(7585),n=a(72117),l=a(13538),d=a(89355),u=e([l]);l=(u.then?(await u)():u)[0];let{handlers:o,auth:c,signIn:h,signOut:S}=(0,i.ZP)({...d.Z,debug:!0,providers:[(0,n.Z)({clientId:process.env.KAKAO_CLIENT_ID,clientSecret:process.env.KAKAO_CLIENT_SECRET??"",authorization:"https://kauth.kakao.com/oauth/authorize?scope=profile_nickname,profile_image,account_email,talk_message"})],adapter:(0,r.N)(l.prisma),callbacks:{async jwt({token:e,user:t}){if(t){let a=await l.prisma.user.findUnique({where:{id:t.id,deletedAt:null},select:{role:!0,id:!0}});e.role=a?.role,e.userId=a?.id}return e},session:async({session:e,token:t})=>(t&&(e.user.role=t.role,e.user.id=t.userId),e)},events:{async createUser({user:e}){e.name||await l.prisma.user.update({where:{id:e.id},data:{name:"카카오 사용자"}})}}});s()}catch(e){s(e)}})},82996:(e,t,a)=>{a.d(t,{s:()=>s});async function s(){return null}},13538:(e,t,a)=>{a.a(e,async(e,s)=>{try{a.d(t,{prisma:()=>d});var i=a(53524),r=a(49683),n=a(8678),l=e([n,r]);[n,r]=l.then?(await l)():l;let d=globalThis.prisma??function(){let e=new n.Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:!1}}),t=new r.g(e);return new i.PrismaClient({adapter:t,log:["error"]})}();s()}catch(e){s(e)}})},61165:(e,t,a)=>{a.a(e,async(e,s)=>{try{a.d(t,{MH:()=>o,Z1:()=>u});var i=a(95456),r=a(82996),n=a(13538),l=a(58585),d=e([i,n]);async function u(){return await (0,r.s)()||(0,i.I8)()}async function o(e){let t=await u();return t||(0,l.redirect)("/login"),t.user.role!==e&&(0,l.redirect)("/unauthorized"),t}[i,n]=d.then?(await d)():d,s()}catch(e){s(e)}})},68783:(e,t,a)=>{a.a(e,async(e,s)=>{try{a.d(t,{P:()=>o,b:()=>c});var i=a(13538),r=a(53524),n=e([i]);function l(e){if(!Array.isArray(e)||0===e.length)return null;let t=[];for(let a of e)a&&"object"==typeof a&&"string"==typeof a.date&&"string"==typeof a.startTime&&"string"==typeof a.endTime&&t.push({date:a.date,endDate:a.endDate??a.date,startTime:a.startTime,endTime:a.endTime});return t.length>0?t:null}function d(e,t){return new Date(`${e}T${t}:00`)}function u(e,t,a,s,i,r){let n=l(a),u=l(r);if(n&&u){for(let e of n){let t=d(e.date,e.startTime),a=d(e.endDate??e.date,e.endTime);for(let e of u){let s=d(e.date,e.startTime),i=d(e.endDate??e.date,e.endTime);if(t<i&&s<a)return!0}}return!1}let o={start:e,end:t??e},c={start:s,end:i??s};return n?n.some(e=>{let t=d(e.date,e.startTime),a=d(e.endDate??e.date,e.endTime);return t<c.end&&c.start<a}):u?u.some(e=>{let t=d(e.date,e.startTime),a=d(e.endDate??e.date,e.endTime);return o.start<a&&t<o.end}):o.start<c.end&&c.start<o.end}async function o(e){let t=await i.prisma.sosRequest.findUnique({where:{id:e},select:{id:!0,latitude:!0,longitude:!0,radiusKm:!0,requiredFields:!0,requiredCredentials:!0,scheduledAt:!0,scheduledEndAt:!0,scheduleDays:!0}});if(!t)return[];let a=(await i.prisma.sosMatch.findMany({where:{sosRequestId:e},select:{workerProfileId:!0}})).map(e=>e.workerProfileId),s=await i.prisma.workerProfile.findMany({where:{availability:{in:[r.AvailabilityStatus.AVAILABLE,r.AvailabilityStatus.BUSY]},isProfilePublic:!0,workFields:{hasSome:t.requiredFields},...a.length>0?{id:{notIn:a}}:{},user:{deletedAt:null}},select:{id:!0,userId:!0,availability:!0,latitude:!0,longitude:!0,credentials:{where:{status:r.CredentialStatus.APPROVED},select:{type:!0}}}});if(0===s.length)return[];let n=t.requiredCredentials,l=0===n.length?s:s.filter(e=>{let t=new Set(e.credentials.map(e=>e.type));return n.every(e=>t.has(e))});if(0===l.length)return[];let d=l.map(e=>e.id),o=new Set(l.filter(e=>e.availability===r.AvailabilityStatus.BUSY).map(e=>e.id)),c=await i.prisma.sosMatch.findMany({where:{workerProfileId:{in:d},status:{in:[r.SosMatchStatus.ACCEPTED,r.SosMatchStatus.CONFIRMED]},sosRequest:{status:{notIn:[r.SosStatus.CANCELLED,r.SosStatus.COMPLETED]}}},select:{workerProfileId:!0,status:!0,sosRequest:{select:{scheduledAt:!0,scheduledEndAt:!0,scheduleDays:!0}}}}),h=new Set;for(let e of c)(!o.has(e.workerProfileId)||e.status!==r.SosMatchStatus.ACCEPTED)&&u(t.scheduledAt,t.scheduledEndAt??null,t.scheduleDays,e.sosRequest.scheduledAt,e.sosRequest.scheduledEndAt??null,e.sosRequest.scheduleDays)&&h.add(e.workerProfileId);if(h.size>0&&(l=l.filter(e=>!h.has(e.id))),0===l.length)return[];if(null!=t.latitude&&null!=t.longitude){let e=1e3*t.radiusKm,a=t.latitude,s=t.longitude,r=l.map(e=>e.id),n=await i.prisma.$queryRaw`
      SELECT wp.id
      FROM worker_profiles wp
      WHERE wp.id = ANY(${r}::text[])
        AND (
          (
            wp.location IS NOT NULL
            AND ST_DWithin(
              wp.location::geography,
              ST_SetSRID(ST_MakePoint(${s}, ${a}), 4326)::geography,
              ${e}
            )
          )
          OR (
            wp.location IS NULL
            AND wp.latitude IS NOT NULL
            AND wp.longitude IS NOT NULL
            AND ST_DWithin(
              ST_SetSRID(ST_MakePoint(wp.longitude, wp.latitude), 4326)::geography,
              ST_SetSRID(ST_MakePoint(${s}, ${a}), 4326)::geography,
              ${e}
            )
          )
        )
    `,d=new Set(n.map(e=>e.id));return l.filter(e=>d.has(e.id)).map(e=>({workerProfileId:e.id,userId:e.userId}))}return l.map(e=>({workerProfileId:e.id,userId:e.userId}))}async function c(e,t){let s=await i.prisma.workerProfile.findUnique({where:{id:e},select:{id:!0,availability:!0,isProfilePublic:!0,workFields:!0,latitude:!0,longitude:!0,credentials:{where:{status:r.CredentialStatus.APPROVED},select:{type:!0}}}});if(!s||s.availability===r.AvailabilityStatus.UNAVAILABLE||!s.isProfilePublic||0===s.workFields.length)return 0;let n=await i.prisma.sosMatch.findMany({where:{workerProfileId:e},select:{sosRequestId:!0}}),l=new Set(n.map(e=>e.sosRequestId)),d=await i.prisma.sosRequest.findMany({where:{status:{in:[r.SosStatus.DISPATCHING,r.SosStatus.PENDING]},requiredFields:{hasSome:s.workFields},id:l.size>0?{notIn:Array.from(l)}:void 0},select:{id:!0,title:!0,latitude:!0,longitude:!0,radiusKm:!0,requiredCredentials:!0,scheduledAt:!0,scheduledEndAt:!0,scheduleDays:!0}});if(0===d.length)return 0;let o=await i.prisma.sosMatch.findMany({where:{workerProfileId:e,status:{in:[r.SosMatchStatus.ACCEPTED,r.SosMatchStatus.CONFIRMED]},sosRequest:{status:{notIn:[r.SosStatus.CANCELLED,r.SosStatus.COMPLETED]}}},select:{sosRequest:{select:{scheduledAt:!0,scheduledEndAt:!0,scheduleDays:!0}}}}),c=new Set(s.credentials.map(e=>e.type)),h=[];for(let t of d)if((!(t.requiredCredentials.length>0)||t.requiredCredentials.every(e=>c.has(e)))&&!o.some(e=>u(t.scheduledAt,t.scheduledEndAt??null,t.scheduleDays,e.sosRequest.scheduledAt,e.sosRequest.scheduledEndAt??null,e.sosRequest.scheduleDays))){if(null!=t.latitude&&null!=t.longitude){let a=1e3*t.radiusKm,s=t.latitude,r=t.longitude,n=await i.prisma.$queryRaw`
        SELECT (
          CASE
            WHEN wp.location IS NOT NULL THEN
              ST_DWithin(
                wp.location::geography,
                ST_SetSRID(ST_MakePoint(${r}, ${s}), 4326)::geography,
                ${a}
              )
            WHEN wp.latitude IS NOT NULL AND wp.longitude IS NOT NULL THEN
              ST_DWithin(
                ST_SetSRID(ST_MakePoint(wp.longitude, wp.latitude), 4326)::geography,
                ST_SetSRID(ST_MakePoint(${r}, ${s}), 4326)::geography,
                ${a}
              )
            ELSE false
          END
        ) AS ok
        FROM worker_profiles wp
        WHERE wp.id = ${e}
      `;if(!n[0]?.ok)continue}h.push(t.id)}if(0===h.length)return 0;let S=new Date;await i.prisma.sosMatch.createMany({data:h.map(t=>({sosRequestId:t,workerProfileId:e,status:r.SosMatchStatus.NOTIFIED,notifiedAt:S})),skipDuplicates:!0});let{createNotifications:p}=await a.e(2133).then(a.bind(a,22133));return await p(h.map(e=>({userId:t,sosRequestId:e,type:"SOS_REQUEST",title:"SOS 긴급 요청 알림",body:"배치 조건에 맞는 긴급 경비 인력 요청이 있습니다. 지금 확인해 주세요.",sentAt:S}))),h.length}i=(n.then?(await n)():n)[0],s()}catch(e){s(e)}})}};